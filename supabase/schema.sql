-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: SISTEMA DE INVENTARIO
-- Motor: PostgreSQL (Supabase)
-- Moneda: se maneja con NUMERIC(12,2) para evitar errores de punto flotante.
-- Cantidades: NUMERIC(14,3) para admitir unidades enteras o decimales
--             (unidad, caja, paquete, kg, litro, etc.).
--
-- Este archivo es idempotente: puede ejecutarse varias veces sin perder datos.
-- Ejecutelo en el SQL Editor de Supabase.
-- =============================================================================

-- Extension para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. USUARIOS
-- Cuentas que administran el inventario. Cada registro del sistema se aísla
-- por user_id (multi-cuenta / multi-tienda).
-- =============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    -- Verificación del correo. Es informativa: no bloquea el acceso, solo
    -- indica en el perfil si el correo fue confirmado por su dueño.
    email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    email_verificado_en TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Añade las columnas de verificación si la tabla ya existía sin ellas.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificado_en TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(LOWER(email));

-- =============================================================================
-- 1b. TOKENS DE RESTABLECIMIENTO DE CONTRASEÑA
-- Se guarda el hash SHA-256 del token (nunca el token en claro).
-- =============================================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expira_at TIMESTAMPTZ NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_hash ON password_reset_tokens(token_hash);

-- =============================================================================
-- 1c. TOKENS DE VERIFICACIÓN DE CORREO
-- Igual que los tokens de restablecimiento: se guarda el hash SHA-256, nunca
-- el token en claro. Un token solo puede usarse una vez y tiene caducidad.
-- =============================================================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expira_at TIMESTAMPTZ NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verif_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verif_hash ON email_verification_tokens(token_hash);

-- =============================================================================
-- 2. CATEGORIAS
-- Administrables por el usuario (no hay listas fijas en el código).
-- =============================================================================
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    nombre VARCHAR(80) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categorias_user ON categorias(user_id, activo);
-- El nombre de la categoría no se repite dentro de una misma cuenta (sin distinguir mayúsculas).
CREATE UNIQUE INDEX IF NOT EXISTS ux_categorias_user_nombre ON categorias(user_id, LOWER(nombre));

-- =============================================================================
-- 3. PROVEEDORES
-- Empresas o personas que suministran productos. Campos opcionales, sin
-- convertirlos en obligatorios.
-- =============================================================================
CREATE TABLE IF NOT EXISTS proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    nombre VARCHAR(150) NOT NULL,
    contacto VARCHAR(120),
    telefono VARCHAR(30),
    email VARCHAR(150),
    direccion VARCHAR(200),
    nit VARCHAR(30),
    observaciones TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proveedores_user ON proveedores(user_id, activo);
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(user_id, LOWER(nombre));

-- =============================================================================
-- 4. PRODUCTOS
-- Catálogo con existencias actuales, stock mínimo y precios.
-- stock es un valor derivado que SOLO se modifica mediante las funciones RPC
-- transaccionales (nunca con UPDATE directo desde la aplicación).
-- =============================================================================
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
    proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL,
    nombre VARCHAR(150) NOT NULL,
    sku VARCHAR(60) NOT NULL,
    descripcion TEXT,
    precio_compra NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (precio_compra >= 0.00),
    precio_venta NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (precio_venta >= 0.00),
    stock NUMERIC(14, 3) NOT NULL DEFAULT 0.000 CHECK (stock >= 0.000),
    stock_minimo NUMERIC(14, 3) NOT NULL DEFAULT 0.000 CHECK (stock_minimo >= 0.000),
    unidad_medida VARCHAR(30) NOT NULL DEFAULT 'unidad',
    imagen_url TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- El SKU es único dentro del inventario de cada cuenta (sin distinguir mayúsculas).
CREATE UNIQUE INDEX IF NOT EXISTS ux_productos_user_sku ON productos(user_id, LOWER(sku));
CREATE INDEX IF NOT EXISTS idx_productos_user ON productos(user_id, activo);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(user_id, LOWER(nombre));
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_proveedor ON productos(proveedor_id);

-- =============================================================================
-- 5. ENTRADAS DE INVENTARIO (cabecera)
-- Una compra/reabastecimiento puede incluir varios productos (ver detalles).
-- =============================================================================
CREATE TABLE IF NOT EXISTS entradas_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL,
    observaciones TEXT,
    total NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0.00),
    -- Clave de idempotencia enviada por el cliente para evitar doble registro
    -- por reintentos o problemas de conexión.
    client_request_id UUID,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entradas_user ON entradas_inventario(user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_entradas_proveedor ON entradas_inventario(proveedor_id, fecha DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_entradas_req
    ON entradas_inventario(user_id, client_request_id)
    WHERE client_request_id IS NOT NULL;

-- =============================================================================
-- 6. DETALLES DE ENTRADA
-- Líneas de producto incluidas en cada entrada.
-- =============================================================================
CREATE TABLE IF NOT EXISTS detalles_entrada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrada_id UUID NOT NULL REFERENCES entradas_inventario(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad NUMERIC(14, 3) NOT NULL CHECK (cantidad > 0.000),
    costo_unitario NUMERIC(12, 2) NOT NULL CHECK (costo_unitario >= 0.00),
    subtotal NUMERIC(14, 2) NOT NULL CHECK (subtotal >= 0.00)
);

CREATE INDEX IF NOT EXISTS idx_detalles_entrada ON detalles_entrada(entrada_id);
CREATE INDEX IF NOT EXISTS idx_detalles_entrada_producto ON detalles_entrada(producto_id);

-- =============================================================================
-- 7. SALIDAS DE INVENTARIO
-- Ventas, productos dañados/perdidos, uso interno, ajustes u otros motivos.
-- =============================================================================
CREATE TABLE IF NOT EXISTS salidas_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad NUMERIC(14, 3) NOT NULL CHECK (cantidad > 0.000),
    motivo VARCHAR(30) NOT NULL CHECK (
        motivo IN ('VENTA', 'DANADO', 'PERDIDO', 'USO_INTERNO', 'AJUSTE', 'OTRO')
    ),
    observaciones TEXT,
    client_request_id UUID,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salidas_user ON salidas_inventario(user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_salidas_producto ON salidas_inventario(producto_id, fecha DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_salidas_req
    ON salidas_inventario(user_id, client_request_id)
    WHERE client_request_id IS NOT NULL;

-- =============================================================================
-- 8. AJUSTES DE INVENTARIO
-- Corrección de existencias tras un conteo físico. Conserva el valor anterior,
-- el conteo físico y la diferencia calculada.
-- =============================================================================
CREATE TABLE IF NOT EXISTS ajustes_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    existencias_anteriores NUMERIC(14, 3) NOT NULL CHECK (existencias_anteriores >= 0.000),
    existencias_fisicas NUMERIC(14, 3) NOT NULL CHECK (existencias_fisicas >= 0.000),
    diferencia NUMERIC(14, 3) NOT NULL,
    motivo VARCHAR(40) NOT NULL CHECK (
        motivo IN ('CONTEO_FISICO', 'ERROR_REGISTRO', 'MERMA', 'DEVOLUCION', 'OTRO')
    ),
    observaciones TEXT,
    client_request_id UUID,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ajustes_user ON ajustes_inventario(user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_ajustes_producto ON ajustes_inventario(producto_id, fecha DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ajustes_req
    ON ajustes_inventario(user_id, client_request_id)
    WHERE client_request_id IS NOT NULL;

-- =============================================================================
-- 9. MOVIMIENTOS DE INVENTARIO
-- Historial cronológico e INMUTABLE. Cada movimiento conserva existencias
-- anteriores y posteriores para reconstruir cómo cambió el inventario.
-- cantidad es un delta con signo (+entrada / -salida / ±ajuste).
-- =============================================================================
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA', 'AJUSTE')),
    referencia_id UUID NOT NULL,
    descripcion TEXT NOT NULL,
    cantidad NUMERIC(14, 3) NOT NULL CHECK (cantidad <> 0.000),
    existencias_anteriores NUMERIC(14, 3) NOT NULL CHECK (existencias_anteriores >= 0.000),
    existencias_posteriores NUMERIC(14, 3) NOT NULL CHECK (existencias_posteriores >= 0.000),
    motivo VARCHAR(60),
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_user ON movimientos_inventario(user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_inventario(producto_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos_inventario(user_id, tipo, fecha DESC);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Actualiza updated_at automáticamente.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_usuarios_updated ON usuarios;
CREATE TRIGGER trg_usuarios_updated BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_categorias_updated ON categorias;
CREATE TRIGGER trg_categorias_updated BEFORE UPDATE ON categorias
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_proveedores_updated ON proveedores;
CREATE TRIGGER trg_proveedores_updated BEFORE UPDATE ON proveedores
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_productos_updated ON productos;
CREATE TRIGGER trg_productos_updated BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Los movimientos históricos no deben modificarse ni eliminarse.
-- Si hay que corregir existencias, se registra un AJUSTE (nueva fila).
-- Excepción: durante el borrado de una cuenta se activa una bandera de
-- transacción que autoriza eliminar su historial.
CREATE OR REPLACE FUNCTION bloquear_modificacion_movimientos()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' AND current_setting('app.eliminando_cuenta', true) = 'on' THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Los movimientos de inventario son inmutables: registre un ajuste en lugar de modificarlos';
END;
$$;

DROP TRIGGER IF EXISTS trg_movimientos_inmutables ON movimientos_inventario;
CREATE TRIGGER trg_movimientos_inmutables BEFORE UPDATE OR DELETE ON movimientos_inventario
    FOR EACH ROW EXECUTE FUNCTION bloquear_modificacion_movimientos();

-- =============================================================================
-- FUNCION: ELIMINAR CUENTA
-- Borra la cuenta y todos sus datos en el orden que exigen las claves foráneas.
-- Los movimientos son inmutables, por lo que se activa la bandera de transacción
-- app.eliminando_cuenta para autorizar su borrado solo dentro de este proceso.
-- =============================================================================
CREATE OR REPLACE FUNCTION eliminar_cuenta(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM set_config('app.eliminando_cuenta', 'on', true);

    DELETE FROM movimientos_inventario WHERE user_id = p_user_id;
    DELETE FROM ajustes_inventario WHERE user_id = p_user_id;
    DELETE FROM salidas_inventario WHERE user_id = p_user_id;
    -- Eliminar las entradas borra en cascada sus detalles.
    DELETE FROM entradas_inventario WHERE user_id = p_user_id;
    DELETE FROM productos WHERE user_id = p_user_id;
    DELETE FROM proveedores WHERE user_id = p_user_id;
    DELETE FROM categorias WHERE user_id = p_user_id;
    -- Los tokens de restablecimiento y de verificación caen en cascada.
    DELETE FROM usuarios WHERE id = p_user_id;
END;
$$;

-- =============================================================================
-- POLITICAS DE SEGURIDAD (RLS)
-- La API de Node.js gestiona la autenticación JWT y el aislamiento por user_id
-- usando la service role key (nunca expuesta al navegador). Por eso se
-- deshabilita RLS en estas tablas: el acceso a datos solo ocurre desde el
-- backend, que ya valida la identidad y la pertenencia de cada registro.
-- =============================================================================
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores DISABLE ROW LEVEL SECURITY;
ALTER TABLE productos DISABLE ROW LEVEL SECURITY;
ALTER TABLE entradas_inventario DISABLE ROW LEVEL SECURITY;
ALTER TABLE detalles_entrada DISABLE ROW LEVEL SECURITY;
ALTER TABLE salidas_inventario DISABLE ROW LEVEL SECURITY;
ALTER TABLE ajustes_inventario DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- FUNCIONES TRANSACCIONALES (RPC)
-- Todas bloquean el producto con SELECT ... FOR UPDATE, de modo que dos
-- operaciones simultáneas sobre el mismo producto se serializan y nunca
-- pueden dejar existencias negativas ni cálculos inconsistentes.
-- Todas reciben p_user_id para garantizar el aislamiento por cuenta.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENTRADA: suma existencias de uno o varios productos en una sola operación.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION registrar_entrada_transaccional(
    p_user_id UUID,
    p_proveedor_id UUID,
    p_items JSONB,
    p_observaciones TEXT DEFAULT NULL,
    p_client_request_id UUID DEFAULT NULL,
    p_fecha TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_entrada_id UUID;
    v_total NUMERIC(14, 2) := 0.00;
    v_item RECORD;
    v_detalle_id UUID;
    v_stock_actual NUMERIC(14, 3);
    v_stock_nuevo NUMERIC(14, 3);
    v_subtotal NUMERIC(14, 2);
    v_fecha_efectiva TIMESTAMPTZ := COALESCE(p_fecha, NOW());
    v_resultado JSONB := '[]'::JSONB;
BEGIN
    -- Idempotencia: si la operación ya se registró, devolverla sin duplicar.
    IF p_client_request_id IS NOT NULL THEN
        SELECT id INTO v_entrada_id
        FROM entradas_inventario
        WHERE user_id = p_user_id AND client_request_id = p_client_request_id;

        IF FOUND THEN
            RETURN jsonb_build_object('entrada_id', v_entrada_id, 'idempotente', TRUE);
        END IF;
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La entrada debe incluir al menos un producto';
    END IF;

    IF p_proveedor_id IS NOT NULL THEN
        PERFORM 1 FROM proveedores
        WHERE id = p_proveedor_id AND user_id = p_user_id AND activo = TRUE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Proveedor no encontrado o inactivo';
        END IF;
    END IF;

    INSERT INTO entradas_inventario (
        user_id, proveedor_id, observaciones, total, client_request_id, fecha
    ) VALUES (
        p_user_id, p_proveedor_id, NULLIF(TRIM(p_observaciones), ''), 0.00,
        p_client_request_id, v_fecha_efectiva
    )
    RETURNING id INTO v_entrada_id;

    FOR v_item IN
        SELECT * FROM jsonb_to_recordset(p_items) AS x(
            producto_id UUID,
            cantidad NUMERIC(14, 3),
            costo_unitario NUMERIC(12, 2)
        )
    LOOP
        IF v_item.cantidad IS NULL OR v_item.cantidad <= 0 THEN
            RAISE EXCEPTION 'La cantidad recibida debe ser mayor a 0';
        END IF;
        IF v_item.costo_unitario IS NULL OR v_item.costo_unitario < 0 THEN
            RAISE EXCEPTION 'El costo unitario no puede ser negativo';
        END IF;

        SELECT stock INTO v_stock_actual
        FROM productos
        WHERE id = v_item.producto_id AND user_id = p_user_id AND activo = TRUE
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto no encontrado o inactivo';
        END IF;

        v_stock_nuevo := v_stock_actual + v_item.cantidad;
        v_subtotal := ROUND(v_item.cantidad * v_item.costo_unitario, 2);
        v_total := v_total + v_subtotal;

        INSERT INTO detalles_entrada (
            entrada_id, producto_id, cantidad, costo_unitario, subtotal
        ) VALUES (
            v_entrada_id, v_item.producto_id, v_item.cantidad,
            v_item.costo_unitario, v_subtotal
        )
        RETURNING id INTO v_detalle_id;

        UPDATE productos SET stock = v_stock_nuevo WHERE id = v_item.producto_id;

        INSERT INTO movimientos_inventario (
            user_id, producto_id, tipo, referencia_id, descripcion,
            cantidad, existencias_anteriores, existencias_posteriores, motivo, fecha
        ) VALUES (
            p_user_id, v_item.producto_id, 'ENTRADA', v_detalle_id,
            'Entrada de inventario', v_item.cantidad,
            v_stock_actual, v_stock_nuevo,
            CASE WHEN p_proveedor_id IS NOT NULL THEN 'Compra a proveedor' ELSE 'Reabastecimiento' END,
            v_fecha_efectiva
        );

        v_resultado := v_resultado || jsonb_build_object(
            'producto_id', v_item.producto_id,
            'cantidad', v_item.cantidad,
            'existencias_anteriores', v_stock_actual,
            'existencias_posteriores', v_stock_nuevo
        );
    END LOOP;

    UPDATE entradas_inventario SET total = v_total WHERE id = v_entrada_id;

    RETURN jsonb_build_object(
        'entrada_id', v_entrada_id,
        'total', v_total,
        'fecha', v_fecha_efectiva,
        'productos', v_resultado,
        'idempotente', FALSE
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- SALIDA: descuenta existencias validando que nunca queden negativas.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION registrar_salida_transaccional(
    p_user_id UUID,
    p_producto_id UUID,
    p_cantidad NUMERIC(14, 3),
    p_motivo VARCHAR(30),
    p_observaciones TEXT DEFAULT NULL,
    p_client_request_id UUID DEFAULT NULL,
    p_fecha TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_salida_id UUID;
    v_stock_actual NUMERIC(14, 3);
    v_stock_nuevo NUMERIC(14, 3);
    v_fecha_efectiva TIMESTAMPTZ := COALESCE(p_fecha, NOW());
BEGIN
    IF p_client_request_id IS NOT NULL THEN
        SELECT id INTO v_salida_id
        FROM salidas_inventario
        WHERE user_id = p_user_id AND client_request_id = p_client_request_id;

        IF FOUND THEN
            RETURN jsonb_build_object('salida_id', v_salida_id, 'idempotente', TRUE);
        END IF;
    END IF;

    IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad de la salida debe ser mayor a 0';
    END IF;

    IF p_motivo NOT IN ('VENTA', 'DANADO', 'PERDIDO', 'USO_INTERNO', 'AJUSTE', 'OTRO') THEN
        RAISE EXCEPTION 'Motivo de salida no válido';
    END IF;

    SELECT stock INTO v_stock_actual
    FROM productos
    WHERE id = p_producto_id AND user_id = p_user_id AND activo = TRUE
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto no encontrado o inactivo';
    END IF;

    IF v_stock_actual < p_cantidad THEN
        RAISE EXCEPTION 'Existencias insuficientes: disponible %, solicitado %',
            v_stock_actual, p_cantidad;
    END IF;

    v_stock_nuevo := v_stock_actual - p_cantidad;

    INSERT INTO salidas_inventario (
        user_id, producto_id, cantidad, motivo, observaciones,
        client_request_id, fecha
    ) VALUES (
        p_user_id, p_producto_id, p_cantidad, p_motivo,
        NULLIF(TRIM(p_observaciones), ''), p_client_request_id, v_fecha_efectiva
    )
    RETURNING id INTO v_salida_id;

    UPDATE productos SET stock = v_stock_nuevo WHERE id = p_producto_id;

    INSERT INTO movimientos_inventario (
        user_id, producto_id, tipo, referencia_id, descripcion,
        cantidad, existencias_anteriores, existencias_posteriores, motivo, fecha
    ) VALUES (
        p_user_id, p_producto_id, 'SALIDA', v_salida_id,
        'Salida de inventario', -p_cantidad,
        v_stock_actual, v_stock_nuevo, p_motivo, v_fecha_efectiva
    );

    RETURN jsonb_build_object(
        'salida_id', v_salida_id,
        'cantidad', p_cantidad,
        'existencias_anteriores', v_stock_actual,
        'existencias_posteriores', v_stock_nuevo,
        'fecha', v_fecha_efectiva,
        'idempotente', FALSE
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- AJUSTE: fija las existencias al conteo físico y registra la diferencia.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION registrar_ajuste_transaccional(
    p_user_id UUID,
    p_producto_id UUID,
    p_existencias_fisicas NUMERIC(14, 3),
    p_motivo VARCHAR(40),
    p_observaciones TEXT DEFAULT NULL,
    p_client_request_id UUID DEFAULT NULL,
    p_fecha TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ajuste_id UUID;
    v_stock_actual NUMERIC(14, 3);
    v_diferencia NUMERIC(14, 3);
    v_fecha_efectiva TIMESTAMPTZ := COALESCE(p_fecha, NOW());
BEGIN
    IF p_client_request_id IS NOT NULL THEN
        SELECT id INTO v_ajuste_id
        FROM ajustes_inventario
        WHERE user_id = p_user_id AND client_request_id = p_client_request_id;

        IF FOUND THEN
            RETURN jsonb_build_object('ajuste_id', v_ajuste_id, 'idempotente', TRUE);
        END IF;
    END IF;

    IF p_existencias_fisicas IS NULL OR p_existencias_fisicas < 0 THEN
        RAISE EXCEPTION 'Las existencias físicas no pueden ser negativas';
    END IF;

    IF p_motivo NOT IN ('CONTEO_FISICO', 'ERROR_REGISTRO', 'MERMA', 'DEVOLUCION', 'OTRO') THEN
        RAISE EXCEPTION 'Motivo de ajuste no válido';
    END IF;

    SELECT stock INTO v_stock_actual
    FROM productos
    WHERE id = p_producto_id AND user_id = p_user_id AND activo = TRUE
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto no encontrado o inactivo';
    END IF;

    v_diferencia := p_existencias_fisicas - v_stock_actual;

    IF v_diferencia = 0 THEN
        RAISE EXCEPTION 'El conteo coincide con el sistema; no hay ajuste que registrar';
    END IF;

    INSERT INTO ajustes_inventario (
        user_id, producto_id, existencias_anteriores, existencias_fisicas,
        diferencia, motivo, observaciones, client_request_id, fecha
    ) VALUES (
        p_user_id, p_producto_id, v_stock_actual, p_existencias_fisicas,
        v_diferencia, p_motivo, NULLIF(TRIM(p_observaciones), ''),
        p_client_request_id, v_fecha_efectiva
    )
    RETURNING id INTO v_ajuste_id;

    UPDATE productos SET stock = p_existencias_fisicas WHERE id = p_producto_id;

    INSERT INTO movimientos_inventario (
        user_id, producto_id, tipo, referencia_id, descripcion,
        cantidad, existencias_anteriores, existencias_posteriores, motivo, fecha
    ) VALUES (
        p_user_id, p_producto_id, 'AJUSTE', v_ajuste_id,
        'Ajuste de inventario', v_diferencia,
        v_stock_actual, p_existencias_fisicas, p_motivo, v_fecha_efectiva
    );

    RETURN jsonb_build_object(
        'ajuste_id', v_ajuste_id,
        'existencias_anteriores', v_stock_actual,
        'existencias_fisicas', p_existencias_fisicas,
        'diferencia', v_diferencia,
        'fecha', v_fecha_efectiva,
        'idempotente', FALSE
    );
END;
$$;

-- =============================================================================
-- FIN DEL ESQUEMA
-- =============================================================================
