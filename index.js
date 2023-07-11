const express = require('express'), axios = require("axios"), bodyParser = require('body-parser');

const botTools = require('./bot'), divisas = require("./divisas.js");
var botRequest = new botTools.botRequest(process.env.token, process.env.id);
var divisa = new divisas.handler();
var [converterFactor, flag, listaDivisas] = [null, null, null]
var [ignore, lat, long, title] = ["", "", "", ""]

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())
app.get('/', (req, res) => {
    res.send('Hello Express app!')
});
/*
    Existencia de divisas en sucursales
        le informo que solamente se separan por 1 hora a partir de la llamada puede acudir en ese lapso?  que  divisa ocupa, cantidad y sucursal si es tan amable
*/

app.post("/webhook", (req, res) => {
    //  https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
    if (req.body?.object) {
        if (req.body?.entry?.[0]?.changes?.[0]?.value.messages?.[0]) {
            let root = req.body.entry[0].changes[0].value
            let from = root.messages[0].from;
            from = from.slice(0, 3) == "521" ? from.replace("521", "52") : from
            let params = async (message, from) => {
                console.log(message)
                switch (message.type) {
                    case "interactive":
                        console.log("INTERACTIVO")
                        return await interactiveHandler(message, from)
                    case "text":
                        console.log("TEXTO")
                        return textHandler(message, from)
                    case "location":
                        console.log("UBICACION")
                        return await locationHandler(message, from)
                    default:
                        console.log(message.type)
                        console.log(root)
                        return unknownHandler(from)
                }
            }
            //if (from == "528666303285"){/////////////////
            params(root.messages[0], from).then((data) => {
                console.log(new Date())
                axios.request(data).then(function(response) {
                    console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n")
                    axios.request(botRequest.setRead(root.messages[0].id)).catch(function(unreaded) {
                        console.log("HUBO UN ERROR \n", unreaded)
                    });
                    res.sendStatus(200);
                }).catch(function(error) {
                    console.log("--------------------------------------------------------\n", error.response.data.error)
                    //console.log(JSON.stringify(data))
                    axios.request(unknownHandler(from))
                    res.sendStatus(404);
                });
            })
            //}//////////////////////

        }
    } else {
        res.sendStatus(404);
    }
});

app.get("/webhook", (req, res) => {
    const verify_token = process.env.verify_token;

    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === verify_token) {
            console.log("WEBHOOK_VERIFIED");
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.listen(3000, () => {
    console.log('server started');
});

async function interactiveHandler(message, from) {
    switch (message.interactive.type) {
        case "list_reply":
            switch (message.interactive.list_reply.id.split(" ")[0]) {
                case "sucursal":
                    [ignore, lat, long] = message.interactive.list_reply.id.split(" ")
                    return sucursalHandler(from, lat, long)
                case "sucursalesPagina":
                    let index = message.interactive.list_reply.id.split(" ")[1]
                    return listHandler(message, from, index)
                case "convertir":
                    [ignore, converterFactor, flag] = message.interactive.list_reply.id.split(" ")
                    return convertirHandler(message, from, flag)
                case "faq":
                    [ignore, faq] = message.interactive.list_reply.id.split(" ")
                    //return botRequest.buildText(from, divisa.getFaqs(faq).respuesta)
                    return faqsHandler(from, divisa.getFaqs(faq).respuesta)
                case "divisas":
                    [ignore, lat, long, offset] = message.interactive.list_reply.id.split(" ")
                    return divisasHandler(from, lat, long, Number(offset))
                default:
                    return unknownHandler(from)
            }
        case "button_reply":
            switch (message.interactive.button_reply.id.split(" ")[0]) {
                case "solicita":
                    return botRequest.buildText(from, divisa.getTexto("textoEnviarLocalizacion"))
                case "ubicaciones":
                    return listHandler(message, from)
                case "faq":
                    return faqsHandler(from)
                case "localizar":
                    [ingore, lat, long] = message.interactive.button_reply.id.split(" ")
                    return localizarHandler(from, lat, long)
                case "divisas":
                    [ignore, lat, long] = message.interactive.button_reply.id.split(" ")
                    return divisasHandler(from, lat, long)
                case "inicio":
                    return botRequest.buildButtons(from, divisa.getTexto("textoBienvenida"), [
                        { id: "solicita", text: divisa.getTexto("botonSolicita") },
                        { id: "ubicaciones", text: divisa.getTexto("botonUbicaciones") },
                        { id: "faq", text: divisa.getTexto("botonFaq") }
                    ])
                default:
                    return unknownHandler(from)
            }
        default:
            console.log(message)
    }
}

/*------------------------------*/
/*---------- HANDLERS ----------*/
/*------------------------------*/

function textHandler(message, from) {
    let msg_body = message.text.body.toLowerCase(); // extract the message text from the webhook payload
    let msg_id = message.id
    if (converterFactor) {
        let cantidad = msg_body.match(/[0-9]+([,.][0-9]+)?/)
        if (cantidad) {
            if (listaDivisas != null) {
                [texto, converterFactor] = [`${divisa.getTexto("textoConvertido")} *_$ ${(+cantidad[0].replace(",", ".") * converterFactor).toFixed(2)}_*\n\n${divisa.getTexto("textoMasConversiones")}`, null]
                return botRequest.buildList(from, {
                    body: texto,
                    boton: divisa.getTexto("listaTipoCambio")
                }, [{ titulo: "Opciones", botones: listaDivisas }])
            }
            //return botRequest.buildText(from,`${divisa.getTexto("textoConvertido")} _$ ${(+cantidad[0].replace(",", ".") * converterFactor).toFixed(2)}_\n\n${divisa.getTexto("textoMasConversiones")}` )
        }
    }
    return botRequest.buildButtons(from, divisa.getTexto("textoBienvenida"), [
        { id: "solicita", text: divisa.getTexto("botonSolicita") },
        { id: "ubicaciones", text: divisa.getTexto("botonUbicaciones") },
        { id: "faq", text: divisa.getTexto("botonFaq") }
    ])
}

function unknownHandler(from) {
    return botRequest.buildButtons(from, divisa.getTexto("Error"), [
        { id: "inicio", text: divisa.getTexto("textoInicio") }
    ])
}

async function locationHandler(message, from) {
    console.log(message.location)
    return await divisa.getUbicaciones(message.location.latitude, message.location.longitude).then(function(data) {
        return botRequest.buildList(from, { body: divisa.getTexto("textoUbicacionesCercanas"), boton: divisa.getTexto("listaUbicacionesCercanas") }, [{
            titulo: "Sucursales",
            botones: data.slice(0, 10).reduce((acc, curr) => {
                return [
                    ...acc,
                    {
                        id: `sucursal ${curr.latitud} ${curr.longitud}`,
                        titulo: `${curr.sucursal}`,
                        description: `${curr.ciudad}`
                    }
                ]
            }, [])
        }])
    })
}

async function listHandler(message, from, index = 0) {
    return await divisa.getUbicaciones().then(function(data) {
        let dataList = data.slice(index * 9, ((index * 1) + 1) * 9)
        list = dataList.reduce((acc, curr) => {
            item = {
                id: `sucursal ${curr.latitud} ${curr.longitud}`,
                titulo: `${curr.sucursal.trim()}`,
                description: `${curr.ciudad.trim()}`
            }
            acc.botones.push(item)
            return acc
        }, { titulo: "sucursales", botones: [] })
        index++
        let len = data.slice(index * 9, (index + 1) * 9).length
        if (len != 0) {
            list.botones.push({
                id: `sucursalesPagina ${index}`,
                titulo: divisa.getTexto("botonPaginacion"),
                description: `${(index * 9) + 1} - ${(len + (index * 9))}`
            })
        }
        console.log(list)
        return botRequest.buildList(from, { body: list.botones.slice(0, 9).reduce((acc, curr) => { return `${acc}\n\n*${curr.titulo}*` }, divisa.getTexto("textoListaSucursales")), boton: divisa.getTexto("listaSucursales") }, [list])
    })
}

function faqsHandler(from, texto = divisa.getTexto("textoFaqs")) {
    let buttons = divisa.getFaqs().reduce((acc, curr, ind) => {
        return [
            ...acc,
            {
                id: `faq ${ind}`,
                titulo: curr.pregunta,
                description: curr.pregunta
            }
        ]
    }, [])
    return botRequest.buildList(from, {
        body: texto,
        boton: divisa.getTexto("listaFaqs")
    }, [{ titulo: "Opciones", botones: buttons }])
}

function localizarHandler(from, lat, long) {
    return botRequest.buildLocation(from, {
        latitude: lat,
        longitude: long,
        name: title.replaceAll("_", " "),
        address: title.replaceAll("_", " ")
    })
}

async function divisasHandler(from, lat, long, offset = 0) {
    return await divisa.getDivisas(lat, long).then((data) => {
        let buttons = data.divisaCapturaDTOList.slice(offset, offset+4).reduce((acc, curr) => {
            return curr.divisa == "Pesos" ? acc : {lista: [
                ...acc.lista,
                {
                    id: `convertir ${1 / curr.venta} ${curr.divisa}`,
                    titulo: `${divisa.getBandera(curr.divisa)} Venta a $ ${curr.venta}`,
                    description: `Convertir Pesos a ${curr.divisa}`
                }, {
                    id: `convertir ${curr.compra} ${curr.divisa}`,
                    titulo: `${divisa.getBandera(curr.divisa)} Comprar a $ ${curr.compra}`,
                    description: `Convertir ${curr.divisa} a Pesos`
                }
            ], texto: `${acc.texto} ${divisa.getBandera(curr.divisa)}`}
        }, {
            lista: [], 
            texto:  divisa.getTexto("textoDivisasListadas")
        })
        
        let offsetList = data.divisaCapturaDTOList.slice(offset+4, offset+8)
        if(offsetList.length > 0){
            buttons.lista.push({
                id: `divisas ${lat} ${long} ${offset+4}`,
                titulo: divisa.getTexto("botonPaginacion"),
                description: offsetList.reduce((acc, curr)=>{return curr.divisa == "Pesos" ? acc : `${acc} ${divisa.getBandera(curr.divisa)}`}, divisa.getTexto("textoDivisasListadas") )
            })
        }
        listaDivisas = buttons
        console.log(data.zona)
        return botRequest.buildList(from, {
           header: data.zona,
            body: divisa.getTexto("textoTipoCambio"),
            footer: buttons.texto,
            boton: divisa.getTexto("listaTipoCambio")
        }, [{ titulo: "Opciones", botones: buttons.lista }])
    })
}

function convertirHandler(message, from, flag) {
    return botRequest.buildText(from, divisa.getTexto("textoConvertirDivisa") + (message.interactive.list_reply.title.includes("Comprar") ? `${divisa.getBandera(flag)} a ${divisa.getBandera("Pesos")}` : `${divisa.getBandera("Pesos")} a ${divisa.getBandera(flag)}`))
}

async function sucursalHandler(from, lat, long) {
    return await divisa.getDivisas(lat, long).then((data) => {
        return botRequest.buildButtons(from, data.divisaCapturaDTOList.reduce((acc, curr) => {
            return curr.divisa == "Pesos" ? acc : `${acc}\n\n${curr.moneda} ${curr.divisa}\n*COPMRA:*  _$ ${curr.compra}_\n*VENTA:*  _$ ${curr.venta}_`
        }, `${data.zona}\n\n${parseHtml(data.descripcion)}`), [
            {
                id: `localizar ${data.latitudUbicacion} ${data.longitudUbicacion} ${data.zona.replaceAll(" ", "_")}`,
                text:  divisa.getTexto("textoLocalizar")
            }, {
                id: `divisas ${data.latitudUbicacion} ${data.longitudUbicacion}`,
                text:  divisa.getTexto("textoDivisas")
            }
        ]);
    });
}

/*-------------------------------*/
/*---------- FUNCTIONS ----------*/
/*-------------------------------*/

function parseHtml(text = "") {
    text = text.replaceAll("<br>", "\n").replaceAll(/<\/[b|strong]*>/gi, "* ").replaceAll(/<[b|strong]*>/gi, "*")
    return text
}

function parseHorario(text = "") {
    return text.slice(text.lastIndexOf("*Horarios:*"))
}

/*
https://www.storyblocks.com/images/stock/material-design-ui-ux-and-gui-kit-for-online-food-order-mobile-apps-with-login-menu-select-food-pizza-food-pizza-type-detail-confirmation-delivery-details-payment-option-and-order-placed-screens-sy9c9a866xj1gusvdd

https://www.dreamstime.com/stock-illustration-material-design-ui-ux-gui-screens-health-medical-mobile-apps-doctor-details-booking-select-date-time-edit-profile-image84273695

https://developers.facebook.com/docs/messenger-platform/overview

https://wit.ai/docs/tutorials

https://drive.google.com/file/d/1G41WfgpMsSYotJhRCKe0ljrMaUlbxsNc/edit?pli=1


*/