export enum CondicionVenta {
    DEPOSITO_ANTICIPADO = 'DEPOSITO_ANTICIPADO',
    TREINTA_DIAS = 'TREINTA_DIAS',
    RECIBIDO = 'RECIBIDO',
}

export enum Moneda {
    PESOS = 'PESOS',
    DOLARES = 'DOLARES',
}

export enum TipoCotizacion {
    MERCADO = 'MERCADO',
    MANUAL = 'MANUAL',
}

export enum TipoCuenta {
    CAJA_AHORRO_PESOS = 'CAJA_AHORRO_PESOS',
    CUENTA_CORRIENTE_PESOS = 'CUENTA_CORRIENTE_PESOS',
    CAJA_AHORRO_DOLARES = 'CAJA_AHORRO_DOLARES',
    CUENTA_CORRIENTE_DOLARES = 'CUENTA_CORRIENTE_DOLARES',
}

export interface RazonSocialDTO {
    id: number;
    nombre: string;
    descuentoSobreLista: string;
    descuentoSobreFactura: string;
    cuentasBancarias: CuentaBancariaDTO[];
}

/*export interface RazonSocial {
    id?: number;
    nombre: string;
    descuentoSobreLista: string;
    descuentoSobreFactura: string;
    cuentasBancarias: CuentaBancaria[];
}*/

export interface ProveedorDetallado {
    id: number;
    nombre: string;
    cuit: string;
    calle: string;
    altura: string;
    codigoPostal: string;
    provincia: string;
    ciudad: string;
    telefonoFijo: string;
    celular: string;
    nombreTransporte: string;
    domicilioTransporte: string;
    telefonoTransporte: string;
    paginaWeb: string;
    usuarioPagina: string;
    contrasenaPagina: string;
    responsableVentas1: string;
    responsableVentas2: string;
    condicionVenta: string;
    moneda: string;
    tipoCotizacion: string;
    valorCotizacionManual: number;
    observaciones: string;
    razonesSociales: RazonSocialDTO[];
}
export interface CuentaBancariaDTO {
    id: number;
    cbu: string;
    alias: string;
    tipoCuenta: string;
    numeroCuenta: string;
    titular: string;
}
export type ProveedorPayload = Omit<ProveedorDetallado, 'id'> & { id?: number };