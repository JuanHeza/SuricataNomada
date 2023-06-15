const axios = require("axios");
module.exports = {
    handler: class Divisa {
        constructor() {
            this.url = process.env.rootURL,
            this.ubicaciones = `${this.url}divisasServicios/sucursal/listaSucursales`,
            this.tipoCambio = `${this.url}divisasServicios/tipoCambio/compraVentaV2`
            this._faqs = [{
            pregunta: "¿Aceptan morralla?",
            respuesta: "si es morralla americana se aceptan en todas las sucursales de Nuevo León -excepto módulos que se ubican dentro de tiendas HEB_, le solicitan su identificación oficial vigente, el tipo de cambio al momento es de $17.= por cada dólar es informativo el tipo de cambio, se le paga en pesos mexicanos, y también se reciben las monedas de euro y dólar canadiense"
        },{
            pregunta: "¿Compramos billetes y monedas antiguas?",
            respuesta: "una disculpa los billetes solamente los que están en circulación y las monedas antiguas no se reciben, le comento que  las monedas que se reciben solamente en sucursal Cuauhtémoc son Centenario 50 , azteca 20, hidalgo de 10, 5,2.5, 2 y la onza troy de plata y libertad"
        },{
            pregunta: "¿Aceptan pago con tarjeta?",
            respuesta: "solamente se reciben tarjetas en sucursales de Nuevo Léon con un cargo del 2.3%, con su identificación oficial vigente, se reciben tarjetas de bancos nacionales , american express no se recibe"
        },{
            pregunta: "¿Aceptan transferencia?",
            respuesta: "una disculpa no aceptamos  transferencias , solamente pagos en efectivo y con tarjetas"
        },{
            pregunta: "Tipo de divisas que manejan",
            respuesta: `las divisas que menciona no las manejamos, le comparto las divisas que  se manejan en sucursales  son 11
            
    ${this.getBandera("USD")} *Dólar Americano*
    ${this.getBandera("EUR")} *Euro*
    ${this.getBandera("CAD")} *Dólar Canadiense*
    ${this.getBandera("BRASIL")} *Real Brasileño*
    ${this.getBandera("CHINA")} *Yuan Chino*
    ${this.getBandera("SUIZA")} *Franco Suizo*
    ${this.getBandera("AUSTRALIA")} *Dólar Australiano*
    ${this.getBandera("GBP")} *Libra Esterlina*
    ${this.getBandera("COLOMBIA")} *Peso Colombiano*
    ${this.getBandera("COREA")} *Won Coreano*
    ${this.getBandera("JPY")} *Yen Japonés*

Le informo que los módulos de San Jorge que se ubican dentro de tiendas HEB solamente manejan dólar americano en billete.`
        },{
            pregunta: "Requisitos e identificaciones aceptadas",
            respuesta: "las identificaciones permitidas son : credencial de elector vigente con dirección completa, pasaporte vigente y matrícula consular vigente , si su identificación no cuenta con dirección completa se requiere 1 comprobante de domicilio a su nombre no mayor a 2 meses de antigüedad, si no cuenta con comprobante de domicilio a su nombre  debe de presentar 2 comprobantes de domicilio de diferentes servicios no mayor a 2 meses de antigüedad y que coincida la misma dirección"
        },{
            pregunta: "Cantidad máxima para compras y venta de dólares.",
            respuesta: "en compra de dólares se le pueden comprar por persona con su identificación oficial vigente 4 mil dólares al mes, ya sea que los cambie en 1 sola operación o varias durante el mes.\nEn ventas se le pueden vender en ventanilla 4,900 usd o el equivalente en otras divisas si requiere mayor cantidad a esta seria transferir la llamada con 1 promotor para que le informe requisitos, o si gusta dejarnos su nombre y teléfono para que el promotor se comunique con usted  a la brevedad posible y le informe requisitos"
        }]
        }

        async getUbicaciones(latitudUbicacion = 0, longitudUbicacion = 0, zonaId = 0) {
            let params = {
                method: 'POST',
                url: this.ubicaciones,
                headers: {
                    Authorization: "Basic MDow",
                    "Content-Type": "application/json",
                },
                data: {
                    "zonaId": zonaId,
                    "latitudUbicacion": latitudUbicacion,
                    "longitudUbicacion": longitudUbicacion
                }
            }
            //console.log(params)
            return await axios.request(params).then((response) => {
                //console.log(response.data.sucursalesDTOList.length)
                return response.data.sucursalesDTOList
            }).catch((error) => {
                console.log("ERROR: ", error)
            })
        }

        async getDivisas(latitudUbicacion = 0, longitudUbicacion = 0) {
            let params = {
                method: 'POST',
                url: this.tipoCambio,
                headers: {
                    Authorization: "Basic MDow",
                    "Content-Type": "application/json",
                },
                data: {
                    "latitudUbicacion": latitudUbicacion,
                    "longitudUbicacion": longitudUbicacion
                }
            }
            //console.log(params)
            return await axios.request(params).then((response) => {
                //console.log(response.data.divisaCapturaDTOList.length)
                response.data.divisaCapturaDTOList.forEach(div => {
                    div.moneda = this.getBandera([div.divisa])
                 })
                return response.data
            }).catch((error) => {
                console.log("ERROR: ", error)
            })
        }
        getBandera(buscar){
            let banderas = {
                USD: "🇺🇸",
                EUR: "🇪🇺",
                CAD: "🇨🇦",
                GBP: "🇬🇧",
                JPY: "🇯🇵",
                Pesos: "🇲🇽",
                BRASIL: "🇧🇷",
                CHINA: "🇨🇳",
                COLOMBIA: "🇨🇴",
                AUSTRALIA: "🇦🇺",
                COREA: "🇰🇷",
                SUIZA: "🇨🇭"
            }
            return banderas[buscar] || ""
        }
        getFaqs(faq = -1){
            return faq == -1 ? this._faqs : this._faqs[faq]
        }
        
    }
}