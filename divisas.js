const axios = require("axios");
module.exports = {
    handler: class Divisa {
        constructor() {
            this.url = process.env.rootURL,
            this.ubicaciones = `${this.url}divisasServicios/sucursal/listaSucursales`,
            this.tipoCambio = `${this.url}divisasServicios/tipoCambio/compraVentaV2`,
            this.info = `${this.url}divisasServicios/consulta/infoBoot`
            this._faqs_old = [{
                pregunta: "¿Aceptan morralla?", // aqui va punto 3
                respuesta: "Si es _morralla americana_ se aceptan en todas las sucursales de Nuevo León, Quintana Roo y Baja California Sur.\nSe solicita una identificación oficial vigente.\nLa morralla (ya sea americana, euro o canadiense) se compra en un peso menos del tipo de cambio del billete (Compra billete: 16.30, compra morralla: 15.30)"
            }, {
                pregunta: "¿Compramos billetes y monedas antiguas?", // punto 8
                respuesta: "Únicamente se reciben las monedas de oro y plata.\nSe compran únicamente si están en buen estado y en su estuche\nSe requiere presentar una credencial de elector vigente."
            }, {
                pregunta: "¿Aceptan pago con tarjeta?", // aqui va el punto 2 
                respuesta: "Solamente se reciben tarjetas en las sucursales de Nuevo León con un cargo del 2.3% y presentando una credencial de elector vigente.\nSe aceptan tarjetas de bancos nacionales, pero no se acepta American Express.\nNo cuentan con terminal en las sucursales Terminal C, Central, Lincoln, Colosio, Ruiz Cortines y Girasoles."
            }, {
                pregunta: "¿Aceptan transferencia?",
                respuesta: "No se aceptan transferencias, únicamente pagos en efectivo y con tarjetas"
            }, {
                pregunta: "Tipo de divisas que manejan",
                respuesta: `Le comparto las divisas que se manejan en nuestras sucursales, son 11
            
    ${this.getBandera("USD")} *Dólar Americano*
    ${this.getBandera("EUR")} *Euro*
    ${this.getBandera("CAD")} *Dólar Canadiense*
    ${this.getBandera("BRL")} *Real Brasileño*
    ${this.getBandera("CNY")} *Yuan Chino*
    ${this.getBandera("CHF")} *Franco Suizo*
    ${this.getBandera("AUD")} *Dólar Australiano*
    ${this.getBandera("GBP")} *Libra Esterlina*
    ${this.getBandera("COP")} *Peso Colombiano*
    ${this.getBandera("KRW")} *Won Coreano*
    ${this.getBandera("JPY")} *Yen Japonés*`
            }, {
                pregunta: "Requisitos e identificaciones aceptadas",
                respuesta: "Las identificaciones permitidas son: credencial de elector vigente con dirección completa, pasaporte vigente y matrícula consular vigente.\nSi su identificación no cuenta con dirección completa, se requiere un comprobante de domicilio a su nombre con una antigüedad no mayor a 2 meses.\nEn caso de no contar con un comprobante de domicilio a su nombre, deberá presentar 2 comprobantes de domicilio de diferentes servicios con una antigüedad no mayor a 2 meses, y que coincidan con la misma dirección."
            }, {
                pregunta: "Cantidad máxima para compras y venta de dólares.", // punto 4
                respuesta: "En la compra de dólares, se le pueden comprar, por persona, hasta 4,000 dólares por persona al mes, presentando su identificación oficial vigente. Esto puede realizarse en una sola operación o en varias durante el mes.\nEn cuanto a las ventas, se pueden vender hasta 4,900 USD en ventanilla, o su equivalente en otras divisas. Si necesita una cantidad mayor, le sugerimos transferir la llamada a un promotor, quien le proporcionará los requisitos necesarios. Si prefiere, puede dejarnos su nombre y número de teléfono para que el promotor se comunique con usted lo antes posible y le informe los requisitos.\nEn las ventas con el promotor, el trámite puede tardar aproximadamente de 24 a 48 horas."
            }]
            this._textos_old = {
                // TEXTOS NO EN BASE DE DATOS
                textoInicio: "Volver al inicio",
                textoDivisasListadas: "Divisas listadas",
                textoLocalizar: "Localizar Sucursal",
                textoDivisas: "Cambiar Divisas",
                
                //TEXTOS GUARDADOS
                Error: "Hubo un problema. El mensaje no puede ser procesado. Intente más tarde.",
                
                textoFaltante: "Texto Faltante",
                textoConvertido: "La cantidad convertida equivale a\n",
                textoMasConversiones: " _Si desea hacer más conversiones, seleccione de la lista._",
                textoConvertirDivisa: "Ingrese la cantidad que desea convertir.\n",
                textoEnviarLocalizacion: "Por favor, comparta su ubicación actual.",
                textoFaqs: "A continuación, te presentamos una lista con nuestras preguntas frecuentes.",
                textoBienvenida: "¡Hola! Soy el bot de asistencia de Divisas San Jorge. Estoy aquí para ayudarte a encontrar la sucursal más cercana a ti, convertir divisas y proporcionarte información sobre nuestras diferentes ubicaciones.\nPor favor, selecciona alguna de las siguientes opciones para continuar:",
                textoTipoCambio: "Seleccione su tipo de cambio.",
                textoUbicacionesCercanas: "Ubicaciones Cercanas.",
                textoListaSucursales: "Sucursales en esta lista:",

                listaTipoCambios: "Lista de conversión de monedas",
                listaSucursales: "Lista de sucursales",
                listaUbicacionesCercanas: "Lista de ubicaciones",
                listaTipoCambio: "Lista de divisas",
                listaFaqs: "Preguntas frecuentes",

                buttonLocalizar: "Localizar sucursal",
                botonDivisas: "Cambiar divisas",
                botonHorario: "Consultar Horario",
                botonSolicita: "Ubicaciones cercanas",
                botonUbicaciones: "Ubicaciones",
                botonFaq: "Preguntas Frequentes",
                botonPaginacion: `Siguiente página`
            }
            this._faqs = this._faqs_old
            this._textos = this._textos_old
            this.getInfo()
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
            return await axios.request(params).then((response) => {
                return response.data.sucursalesDTOList
            }).catch((error) => {
                console.log("ERROR: ", error)
                return null
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
            return await axios.request(params).then((response) => {
                response.data.divisaCapturaDTOList.forEach(div => {
                    div.moneda = this.getBandera([div.divisa])
                })
                return response.data
            }).catch((error) => {
                console.log("ERROR: ", error)
                return null
            })
        }
        async getInfo() {
            let params = {
                method: 'POST',
                url: this.info,
                headers: {
                    Authorization: "Basic MDow",
                    "Content-Type": "application/json",
                },
            }
            return await axios.request(params).then((response) => {
                if(response.data.errorDTO.codigo == 0){
                    this._faqs = response.data.FAQS
                    // COMENTADO PARA USAR TEXTOS LOCALES, NO LOS DE LA BASE, CONSULTAR SI ES APROPIADO
                    //this._textos = response.data.TEXTOS
                }
            })
        }
        getBandera(buscar) {
            let banderas = {
                USD: "🇺🇸",
                EUR: "🇪🇺",
                CAD: "🇨🇦",
                GBP: "🇬🇧",
                JPY: "🇯🇵",
                Pesos: "🇲🇽",
                BRL: "🇧🇷",
                CNY: "🇨🇳",
                COP: "🇨🇴",
                AUD: "🇦🇺",
                KRW: "🇰🇷",
                CHF: "🇨🇭"
            }
            return banderas[buscar] || ""
        }
        getFaqs(faq = -1) {
            return faq == -1 ? this._faqs : this._faqs[faq]
        }
        getTexto(texto) {
            console.log("Search: ", texto)
            return this._textos[texto] || this._textos.Error            
        }
    }
}