import { config } from "dotenv";
import OpenAI from 'openai';
import fs from 'fs';


config();


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Function to load and process documents from a given file name
async function loadAndProcessDocuments(fileName) {
    // Read the entire file synchronously, assuming UTF-8 encoding
    const text = fs.readFileSync(fileName, 'utf8');
    // Split the text into sections based on two newlines, which could be adjusted based on the document's format
    return text.split('\n\n');  
}

// function to generate vector embeddings from documents
async function generateEmbeddings(documents) {
    return documents.map((doc, index) => ({ id: index, vector: `embed_${index}` }));
}

// function to store the generated embeddings into a vector store
async function createVectorStore(embeddings) {
    console.log('Embeddings stored:', embeddings);
}

// main function to orchestrate the document processing and assistant interaction
async function main() {
    try {
        // Load documents and generate their embeddings
        const documents = await loadAndProcessDocuments('shakespeare.txt');
        const embeddings = await generateEmbeddings(documents);
        await createVectorStore(embeddings);
        

        // Create an OpenAI Assistant configured for retrieval from the documents processed
        const assistant = await openai.beta.assistants.create({
            name: "Shakespeare Bot",
            instructions: "You are a bot that can help provider answered based on the provided documents. if you receive a question that does not pertain to information contained in available documents or previous messages, your response should be - I do not know.",
            tools: [{ type: "retrieval" }],  // Setup with retrieval tool to use indexed documents
            model: "gpt-4-1106-preview",
        });

        // Create a thread 
        const thread = await openai.beta.threads.create();

        // post a message to the thread as a user
        const message = await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: " Who wrote the play Romeo and Juliet?"
        });

        // initiate processing of the thread by the assistant
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistant.id,
            instructions: "Please address the user as Lula.",
        });

        console.log(run);

        // periodically check the status of the run until it's completed
        setTimeout(async () => {
            let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            if(runStatus.status === "completed") {
                let messages = await openai.beta.threads.messages.list(thread.id);
                messages.data.forEach(msg => {
                    const role = msg.role;
                    const content = msg.content[0].text.value;
                    console.log(`${role.charAt(0).toUpperCase() + role.slice(1)}: ${content}`);
                });
            } else {
                console.log("Run is not completed yet.");
            }
        }, 10000);  // Check every 10 seconds

    } catch (error) {
        console.error("Error during execution:", error);
    }
}

// Execute the main function
main();
