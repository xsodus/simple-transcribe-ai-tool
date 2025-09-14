import OpenAI from "openai";

export class OpenAPIFactory {
    public static createAudioInstance(){
         // Public OpenAI key (fallback if Azure OpenAI not configured)
            const apiKey = process.env.OPENAI_API_KEY;
        
            // Azure OpenAI (Azure AI Foundry) environment variables
            // Expected:
            //  AZURE_OPENAI_ENDPOINT=https://<your-resource-name>.openai.azure.com
            //  AZURE_OPENAI_API_KEY=... (key for the Azure OpenAI resource)
            //  AZURE_OPENAI_DEPLOYMENT=gpt-4o-transcribe (deployment name you created)
            //  (optional) AZURE_OPENAI_API_VERSION=2024-06-01
            const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
            const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
            const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT; // deployment name (not the base model name)
            const azureApiVersion =
              process.env.AZURE_OPENAI_API_VERSION || "2024-06-01";
        
            const useAzure = !!(azureEndpoint && azureApiKey && azureDeployment);
        
            if (!useAzure && !apiKey) {
              throw Error("Invalid Setting");
            }
        
            // When using Azure OpenAI with the official openai SDK v4+, set baseURL to the deployment path and add api-version.
            const client = useAzure
              ? new OpenAI({
                  apiKey: azureApiKey!,
                  baseURL:
                    `${azureEndpoint}/openai/deployments/${azureDeployment}`.replace(
                      /\/$/,
                      ""
                    ),
                  defaultQuery: { "api-version": azureApiVersion },
                  // Azure still expects 'api-key' header; the SDK sends Authorization: Bearer by default, so we add explicit header.
                  defaultHeaders: { "api-key": azureApiKey! },
                })
              : new OpenAI({ apiKey: apiKey! });
        
            return client;
    }

    public static createLLMInstance(){
         // Public OpenAI key (fallback if Azure OpenAI not configured)
            const apiKey = process.env.OPENAI_API_KEY;
        
            // Azure OpenAI (Azure AI Foundry) environment variables
            // Expected:
            //  AZURE_OPENAI_ENDPOINT=https://<your-resource-name>.openai.azure.com
            //  AZURE_OPENAI_API_KEY=... (key for the Azure OpenAI resource)
            //  AZURE_OPENAI_DEPLOYMENT=gpt-5 (deployment name you created)
            //  (optional) AZURE_OPENAI_API_VERSION=2024-06-01
            const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
            const azureApiKey = process.env.AZURE_OPENAI_LLM_API_KEY;
            const azureDeployment = process.env.AZURE_OPENAI_LLM_DEPLOYMENT; 
            const azureApiVersion =
              process.env.AZURE_OPENAI_API_VERSION || "2024-06-01";
        
            const useAzure = !!(azureEndpoint && azureApiKey && azureDeployment);
        
            if (!useAzure && !apiKey) {
              throw Error("Invalid Setting");
            }
        
            // When using Azure OpenAI with the official openai SDK v4+, set baseURL to the deployment path and add api-version.
            const client = useAzure
              ? new OpenAI({
                  apiKey: azureApiKey!,
                  baseURL:
                    `${azureEndpoint}/openai/deployments/${azureDeployment}`.replace(
                      /\/$/,
                      ""
                    ),
                  defaultQuery: { "api-version": azureApiVersion },
                  // Azure still expects 'api-key' header; the SDK sends Authorization: Bearer by default, so we add explicit header.
                  defaultHeaders: { "api-key": azureApiKey! },
                })
              : new OpenAI({ apiKey: apiKey! });
        
            return client;
    }
    
}