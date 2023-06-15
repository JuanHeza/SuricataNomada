const express = require('express'), axios = require("axios"), bodyParser = require('body-parser');

const botTools = require('./bot'), divisas = require("./divisas.js");
var botRequest = new botTools.botRequest(process.env.token, process.env.id);
var divisa = new divisas.handler();
var [converterFactor, flag] = [null, null]

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())
app.get('/', (req, res) => {
    res.send('Hello Express app!')
});
/*
    Existencia de divisas en sucursales
        le informo que solamente se separan por 1 hora a partir de la llamada puede acudir en ese lapso?  que  divisa ocupa, cantidad y sucursal si es tan amable
        
    Horario de sucursales
        En un momento te paso un xls
*/

app.post("/webhook", (req, res) => {
    //  https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
    if (req.body?.object) {
        if (req.body?.entry?.[0]?.changes?.[0]?.value.messages?.[0]) {
            let root = req.body.entry[0].changes[0].value
            //console.log(root.messages[0])
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
                    case "sticker":
                        console.log("STICKER")
                        return unknownHandler(from)
                    case "image":
                        console.log("IMAGEN")
                        return unknownHandler(from)
                    case "video":
                        console.log("VIDEO")
                        return unknownHandler(from)
                    case "location":
                        console.log("UBICACION")
                        return await locationHandler(message, from)
                    case "audio":
                        console.log("AUDIO")
                        return unknownHandler(from)
                    case "document":
                        console.log("DOCUMENTO")
                        return unknownHandler(from)
                    case "contacts":
                        console.log("CONTACTO")
                        return unknownHandler(from)
                    default:
                        console.log(root)
                        return unknownHandler(from)
                }
            }

            params(root.messages[0], from).then((data) => {
                console.log(JSON.stringify(data))
                axios.request(data).then(function(response) {
                    console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n")
                    axios.request(botRequest.setRead(root.messages[0].id)).catch(function(unreaded) {
                        console.log("HUBO UN ERROR \n", unreaded)
                    });
                    res.sendStatus(200);
                }).catch(function(error) {
                    console.log("--------------------------------------------------------\n", error.response.data.error)
                    res.sendStatus(404);
                });
            })

        }
    } else {
        res.sendStatus(404);
    }
});

app.get("/webhook", (req, res) => {
    /*
     * UPDATE YOUR VERIFY TOKEN
     *This will be the Verify Token value when you set up webhook
    */
    const verify_token = process.env.verify_token;

    // Parse params from the webhook verification request
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    // Check if a token and mode were sent
    if (mode && token) {
        // Check the mode and token sent are correct
        if (mode === "subscribe" && token === verify_token) {
            // Respond with 200 OK and challenge token from the request
            console.log("WEBHOOK_VERIFIED");
            res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});

app.listen(3000, () => {
    console.log('server started');
});

async function interactiveHandler(message, from) {
    let [ignore, lat, long, title] = ["", "", "", ""]
    switch (message.interactive.type) {
        case "list_reply":
            console.log(message.interactive)
            switch (message.interactive.list_reply.id.split(" ")[0]) {
                case "ubicacion":
                    return botRequest.buildLocation(from)
                case "media":
                    return botRequest.buildMedia(from, "image", { link: "https://placekitten.com/g/450/40" })
                case "sucursal":
                    [ignore, lat, long] = message.interactive.list_reply.id.split(" ")
                    return await divisa.getDivisas(lat, long).then((data) => {
                        return botRequest.buildButtons(from, data.divisaCapturaDTOList.reduce((acc, curr) => {
                            return `${acc}\n\n${curr.moneda} ${curr.divisa}\n*COPMRA:*  _$ ${curr.compra}_\n*VENTA:*  _$ ${curr.venta}_`
                        }, data.zona), [{ id: `localizar ${data.latitudUbicacion} ${data.longitudUbicacion} ${data.zona.replaceAll(" ", "_")}`, text: `Localizar Sucursal` }, { id: `divisas ${data.latitudUbicacion} ${data.longitudUbicacion}`, text: `Cambiar Divisas` }])
                    })
                case "sucursalesPagina":
                    let index = message.interactive.list_reply.id.split(" ")[1]
                    return listHandler(message, from, index)
                case "convertir":
                    [ignore, converterFactor, flag] = message.interactive.list_reply.id.split(" ")
                    return botRequest.buildText(from, "Ingrese la cantidad que desea convertir\n" + (message.interactive.list_reply.title.includes("Comprar") ? `${divisa.getBandera(flag)} a ${divisa.getBandera("Pesos")}` : `${divisa.getBandera("Pesos")} a ${divisa.getBandera(flag)}`))
                case "faq":
                    [ignore, faq] = message.interactive.list_reply.id.split(" ")
                    return botRequest.buildText(from, divisa.getFaqs(faq).respuesta)
                default:
                    return unknownHandler(from)
            }
        case "button_reply":
            switch (message.interactive.button_reply.id.split(" ")[0]) {
                case "tipoCambio":
                    return botRequest.buildText(from, "El tipo de cambio en las siguientes casas es de 0")
                case "solicita":
                    return botRequest.buildText(from, "Por favor envie su ubicacion actual")
                case "ubicaciones":
                    return listHandler(message, from)
                case "faq":
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
                    return botRequest.buildList(from, { body: "Acontinuacion te presentamos una lista con nuestras preguntas frecuentes" }, [{ titulo: "Opciones", botones: buttons }])
                case "localizar":
                    [ingore, lat, long] = message.interactive.button_reply.id.split(" ")
                    return botRequest.buildLocation(from, { latitude: lat, longitude: long, name: title.replaceAll("_", " "), address: title.replaceAll("_", " ") })
                case "divisas":
                    let [ignore, lat, long] = message.interactive.button_reply.id.split(" ")
                    return await divisa.getDivisas(lat, long).then((data) => {
                        let buttons = data.divisaCapturaDTOList.reduce((acc, curr) => {
                            console.log(curr)
                            return curr.divisa == "Pesos" ? acc : [
                                ...acc,
                                {
                                    id: `convertir ${1 / curr.venta} ${curr.divisa}`,
                                    titulo: `${divisa.getBandera(curr.divisa)} Venta a $ ${curr.venta}`,
                                    description: `Convertir Pesos a ${curr.divisa}`
                                }, {
                                    id: `convertir ${curr.compra} ${curr.divisa}`,
                                    titulo: `${divisa.getBandera(curr.divisa)} Comprar a $ ${curr.compra}`,
                                    description: `Convertir ${curr.divisa} a Pesos`
                                }
                            ]
                        }, [])
                        console.log(buttons)
                        return botRequest.buildList(from, { body: "seleccione su tipo de Cambio" }, [{ titulo: "Opciones", botones: buttons }])
                    })
                default:
                    return unknownHandler(from)
            }
        default:
            console.log(message)
    }
}

function textHandler(message, from) {
    let msg_body = message.text.body.toLowerCase(); // extract the message text from the webhook payload
    let msg_id = message.id
    if (converterFactor) {
        let cantidad = msg_body.match(/[0-9]+([,.][0-9]+)?/)
        if (cantidad) {
            return botRequest.buildText(from, `La cantidad convertida equivale a _$ ${(+cantidad[0].replace(",", ".") * converterFactor).toFixed(2)}_\n\n_Si desea hacer mas conversiones seleccione en la lista_`)
        }
        converterFactor = null
    }
   // switch (msg_body) {
     //   case "hola":
            return botRequest.buildButtons(from, "Hola, soy el bot de asistencia de Divisas San Jorge, te ayudare a enconrar la sucursal mas cerna a ti, convertir divisasy conocer nuestros diferentes ubicaciones\nPor favor selecciona alguna de las siguentes opciones", [
                { id: "solicita", text: "Ubicaciones cercanas" },
                { id: "ubicaciones", text: "Ubicaciones" },
                { id: "faq", text: "Preguntas Frequentes" }
            ])
       // default:
         //   return unknownHandler(from)
    //}
}

function unknownHandler(from) {
    return botRequest.buildText(from, "El mensaje no puede ser procesado")
}

async function locationHandler(message, from) {
    console.log(message.location)
    return await divisa.getUbicaciones(message.location.latitude, message.location.longitude).then(function(data) {
        //console.log( data)
        return botRequest.buildList(from, { body: "Ubicaciones Cercanas" }, [{
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
                titulo: `Siguiente Pagina`,
                description: `${(index * 9) + 1} - ${(len + (index * 9))}`
            })
        }
        console.log(list)
        return botRequest.buildList(from, { body: list.botones.slice(0, 9).reduce((acc, curr) => { return `${acc}\n\n*${curr.titulo}*` }, "Sucursales en esta lista:") }, [list])
    })
}