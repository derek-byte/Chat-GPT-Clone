import express from 'express'
import * as path from 'path'
import bodyParser from 'body-parser'
import fetch from 'node-fetch'
import * as dotenv from 'dotenv'

// load environment variables from .env file
dotenv.config();

// initialize express app
export const app = express()

// parse application/json request bodies
app.use(bodyParser.json())

// serve static files from client folder (js, css, images, etc.)
app.use(express.static(path.join(process.cwd(), 'client')))

// define a list of messages to be used as context for the chat
// using the global scope that way it can be used elsewhere on the server, if needed
// (this use of `global` shouldn't be done in a "real" app)
global.messages = [
    {
        role: "system",
        content: "You are a helpful, empathetic, and friendly customer support specialist. You are here to help customers with their orders. You sometimes make small talk."
    },
    {
        role: "system",
        content: "Additionally, you never ask the customer to upload or provide any photos as our website has no means of doing so at this time. Also, do not mention that you are a bot."
    },
];


// our route `/api/openai` is arbitrary
// but it's generally a convention to prefix routes with `/api` 
// followed by a descriptive resource name, in our case `/openai`

// note that this is an HTTP POST request as denoted by `app.post`
app.post('/api/openai', async (req, res) => {
    const { message } = req.body;
    
    // store user message in global message state
    const userMessage = { role: "user", content: message };

    // add to global messages list
    global.messages.push(userMessage);

    // send a request to the OpenAI API with the user's message
    // using the node-fetch library
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            // notice how we're using process.env here
            // this is using the environment variable from the .env file
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
        },
        // construct the request payload
        // using the entire chat history (global.messages)
        // sending an external request to the OpenAI API
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: global.messages,
			// the maximum number of tokens/words the bot should return
            // in response to a given prompt
            max_tokens: 100,
        }),
    });
    
    if (!response.ok) {
        // if the request was not successful, parse the error
        const error = await response.json();

        // log the error for debugging purposes
        console.error('OpenAI API Error:', error);

        // return an error response to the client
        return res.json({ status: 'error', data: null });
    }
    
    // parse the response from OpenAI as json
    const data = await response.json();

    // get the bot's answer from the OpenAI API response
    const botAnswer = data?.choices?.[0]?.message?.content

    // create the bot message object
    const botMessage = { role: "assistant", content: botAnswer };

    // store bot message in global message state
    global.messages.push(botMessage);

    // send the bot's answer back to the client
    return res.json({ status: 'success', data: botAnswer });
});
// set the port to listen on
// which is either the port specified in the .env
// or 3000 if no port is specified
const PORT = process.env.PORT || 3000;

// start the express server
app.listen(PORT, () => console.log(`Server listening on localhost:${PORT}`));

