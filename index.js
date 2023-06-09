const express = require('express'), axios = require("axios"), bodyParser = require('body-parser');

const botTools = require('./bot');
botRequest = new botTools.botRequest(process.env.token, process.env.id)

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

app.get('/', (req, res) => {
    res.send('Hello Express app!')
});

app.post("/webhook", (req, res) => {
    //  https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
    if (req.body?.object) {
        if(req.body?.entry?.[0]?.changes?.[0]?.value.messages?.[0]){
            let root = req.body.entry[0].changes[0].value
            //console.log(root.messages[0])
            let from = root.messages[0].from; 
            from = from.slice(0,3) == "521" ? from.replace("521","52") : from
            let params  = (message, from) => {
                 switch(message.type){
                    case "interactive":
                        console.log("INTERACTIVO")
                        return interactiveHandler(message, from )
                    case "text":
                        console.log("TEXTO")
                        return textHandler(message, from )
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
                        return unknownHandler(from)
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
            
            axios.request(params(root.messages[0],from)).then(function(response) {
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n", response)
                 axios.request(botRequest.setRead(root.messages[0].id)).catch(function(unreaded) {
                     console.log("HUBO UN ERROR \n",unreaded)
                 }); 
                res.sendStatus(200);
            }).catch(function(error) {
                console.log("--------------------------------------------------------\n", error)
                res.sendStatus(404);
            });                
            
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

function interactiveHandler(message, from){
    switch(message.interactive.type){
        case "list_reply":
            console.log(message.interactive)
            switch(message.interactive.list_reply.id){
                case "ubicacion":
                    return botRequest.buildLocation( from)
                case "media":
                    return botRequest.buildMedia(from, "image", {link: "https://placekitten.com/g/450/40"})
            }
        case "button_reply":
            switch(message.interactive.button_reply.id){
                case "tipoCambio":
                    return botRequest.buildText( from, "El tipo de cambio en las siguientes casas es de 0")
                case  "ubicaciones":
                    return botRequest.buildList( from, {body: "prueba"})
            }
            break
        default:
            console.log(message)
    }
    return  botRequest.buildText( from, "No hay datos") 
}

function textHandler(message, from){
    let msg_body = message.text.body.toLowerCase(); // extract the message text from the webhook payload
    let msg_id = message.id
    switch(msg_body){
        case "hola":
            return botRequest.buildButtons( from, "Hola, por favor selecciona alguna de las siguentes opciones", [
                {id: "tipoCambio", text: "Tipo de cambio"},
                {id: "ubicaciones", text: "Ubicaciones"}
            ])
    }
    return botRequest.buildText( from, msg_body)
}

function unknownHandler(from){
    return botRequest.buildText( from, "El mensaje no puede ser procesado")
}