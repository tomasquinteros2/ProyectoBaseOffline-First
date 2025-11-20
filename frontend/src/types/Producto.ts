export interface Proveedor {
    id: number;
    nombre: string;
    contacto?: string;
}

export interface TipoProducto {
    id: number;
    nombre: string;
}
export interface ProductoPageDTO {
    id: number;
    codigoProducto: string;
    descripcion: string;
    cantidad: number;
    iva: number;
    precio_publico: number;
    resto: number;
    precio_sin_redondear: number;
    precio_publico_us: number;
    porcentaje_ganancia: number;
    costo_dolares: number;
    costo_pesos: number;
    precio_sin_iva: number;
    fecha_ingreso: string;
    proveedorId: number;
    tipoProductoId: number;
    costoFijo: boolean;
    productosRelacionadosIds: number[];
}

export interface Producto extends ProductoPageDTO {
    id: number | string;
    productosRelacionados: Producto[];
}
export interface Page<T> {
    content: T[];
    pageable: {
        pageNumber: number;
        pageSize: number;
        sort: {
            sorted: boolean;
            unsorted: boolean;
            empty: boolean;
        };
        offset: number;
        paged: boolean;
        unpaged: boolean;
    };
    totalPages: number;
    totalElements: number;
    last: boolean;
    size: number;
    number: number;
    sort: {
        sorted: boolean;
        unsorted: boolean;
        empty: boolean;
    };
    numberOfElements: number;
    first: boolean;
    empty: boolean;
}

export interface RelatedProductResult {
    id: number;
    descripcion: string;
    nombreProveedor: string;
    precioPublico: number;
    nombreTipoProducto: string;
}
export interface  ProductDiscountPayload{
    id: number;
    cantidad: number;
}