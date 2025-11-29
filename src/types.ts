export interface Venta {
  ano: number;
  mes: string;
  mes_numero?: number;
  vendedor: string;
  ventas: number;
  meta: number;
  cumplimiento: number;
  meta1?: number | null;
  meta2?: number | null;
  cumplimiento1?: number | null;
  cumplimiento2?: number | null;
  [key: string]: string | number | null | undefined;
}
