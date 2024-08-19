import { config } from "dotenv";
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

config();


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Calculate __dirname equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function uploadDocument(fileName) {
    try {
        const filePath = path.join(__dirname, fileName);
        console.log("Uploading document:", filePath);
        const fileData = fs.createReadStream(filePath);

        const response = await openai.files.create({
            file: fileData,
            purpose: 'assistants',
        });

        console.log("File uploaded:", response);
        //console.log("File uploaded, ID:", response.data.id);
        return response.id;
    } catch (error) {
        console.error("Failed to upload document:", error);
        throw error;
    }
}


// Function to create an assistant with the uploaded document
async function createAssistant(fileId) {
    try {
        console.log("Creating assistant with file ID:", fileId);
        const assistant = await openai.beta.assistants.create({
            name: "Shakespeare Bot",
            instructions: "You are a bot that can help with Shakespearean language. Answer questions about Shakespearean plays, characters, and language. Help with writing in the style of Shakespeare.",
            tools: [{ type: "retrieval" }],
            file_ids: [fileId],
            model: "gpt-4-1106-preview",
        });

        console.log("Assistant created successfully.");
        return assistant;
    } catch (error) {
        console.error("Failed to create assistant:", error);
        throw error;  // Rethrow to catch in main function
    }
}

// Main function to orchestrate the document processing and assistant interaction
async function main() {
    try {
        // Upload the document and get the file ID
        const fileId = await uploadDocument('shakespeare.txt');

        // Create an assistant with the uploaded file ID
        const assistant = await createAssistant(fileId);

        // Create a thread for interaction
        const thread = await openai.beta.threads.create();

        // Post a message as a user
        const message = await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: "Who started their Junior Grad role in September 2022?"
        });

        // Initiate processing with the assistant
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistant.id,
            instructions: "You are a bot that can help provider answered based on the provided documents. if you receive a question that does not pertain to information contained in available documents or previous messages, your response should be - I do not know.",
        });

        console.log("Processing initiated:", run);

        // Periodically check the status until it's completed
        const checkStatusAndPrintMessages = async (threadId, runId) => {
            let runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
            if(runStatus.status === "completed"){
                let messages = await openai.beta.threads.messages.list(threadId);
                messages.data.forEach((msg) => {
                    const role = msg.role;
                    const content = msg.content[0].text.value; 
                    console.log(
                        `${role.charAt(0).toUpperCase() + role.slice(1)}: ${content}`
                    );
                });
            } else {
                console.log("Run is not completed yet.");
            }  
        };
        
        setTimeout(() => {
            checkStatusAndPrintMessages(thread.id, run.id)
        }, 10000 );

    } catch (error) {
        console.error("Error during execution:", error);
    }
}

// Execute the main function
main();