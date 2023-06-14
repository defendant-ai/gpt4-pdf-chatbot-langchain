import { OpenAI } from 'langchain/llms/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { ConversationalRetrievalQAChain } from 'langchain/chains';

const CONDENSE_PROMPT = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`;

const QA_PROMPT = `You're name is Ava and are a helpful AI legal assistant. Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say you don't know and tell the person to call/text their lawyer. DO NOT try to make up an answer. 
Your job is also to only give legal INFORMATION based from the documents you have access to, or the in general questions that the user has answers about, which can be answered from their metadata.
 NOT ADVICE.
If the question is not related to the  or the user data that you have access to, politely respond that you are tuned to only answer questions that are related to the context or who they are.
After the % symbol, is the user's metadata. Please always address them by their first name.

{context}

Question: {question}
Helpful answer in markdown:`;

export const makeChain = (vectorstore: PineconeStore, user: String) => {
  const model = new OpenAI({
    temperature: 0, // increase temepreature to get more creative answers
    modelName: 'gpt-3.5-turbo', //change this to gpt-4 if you have access
  });

  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorstore.asRetriever(),
    {
      qaTemplate: QA_PROMPT + '%' + user,
      questionGeneratorTemplate: CONDENSE_PROMPT,
      returnSourceDocuments: false, //The number of source documents returned is 4 by default
    },
  );
  return chain;
};
