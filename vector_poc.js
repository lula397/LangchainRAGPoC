import { config } from "dotenv";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";

// loading the .env file which contains the API key
config(); 

//
const loader = new TextLoader("shakespeare.txt");

// This loads the documents that I want to vectorize
const docs = await loader.load();

// This splits the documents into chunks so that I can vectorize them, which is necessary for the FaissStore
const splitter = new CharacterTextSplitter({
    chunkSize: 200,
    chunkOverlap: 50,
});
// This continues the splitting process
const documents = await splitter.splitDocuments(docs);
console.log(documents);

// This loads the embeddings
const embeddings = new OpenAIEmbeddings();

// This creates my vector store
const vectorstore = await FaissStore.fromDocuments(documents, embeddings);
await vectorstore.save("shakespeare.faiss");

// Run using node vector_poc.js