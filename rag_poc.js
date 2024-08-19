
import { config } from "dotenv";
import { OpenAIEmbeddings } from "@langchain/openai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { OpenAI } from "@langchain/openai";
import { RetrievalQAChain, loadQAStuffChain } from "langchain/chains";

// loading the .env file which contains the API key
config();

// loading the embeddings and the vector store
const embeddings = new OpenAIEmbeddings();
const vectorStore = await FaissStore.load("shakespeare.faiss", embeddings);

// creating the model and the chain
// the temperature is set to 0 to make the model deterministic
// If i change the temperature to 0.7, the model will be creative
const model = new OpenAI({ temperature: 0 });

// the chain is created with the model and the vector store
const chain = new RetrievalQAChain({
    combineDocumentsChain: loadQAStuffChain(model),
    retriever: vectorStore.asRetriever(),
    returnSourceDocuments: true,
});

// Finally, the chain is called with a query which is a question that the model will answer
const res = await chain.call({ query: "Who started their Junior Grad role in September 2022?"});
console.log(res.text);