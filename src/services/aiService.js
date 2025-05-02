import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API with proper configuration
const genAI = new GoogleGenerativeAI('AIzaSyBcZ3uTmksb7lTy24OnaAKKI93Lemai-HM');

// Safety settings to ensure appropriate content
const safetySettings = [
  {
    category: "HARM_CATEGORY_HARASSMENT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE",
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH",
    threshold: "BLOCK_MEDIUM_AND_ABOVE",
  },
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE",
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE",
  },
];

export const generateContentSuggestions = async (topic) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `Generate 3 complete blog post ideas for the topic: "${topic}". For each idea, write:

1. An engaging title
2. A complete introduction paragraph that hooks the reader
3. A full overview of what the article will cover
4. A compelling conclusion paragraph

Make each suggestion read like a complete mini-article. Separate each suggestion with "---".`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }]}],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings,
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating content:', error);
    if (error.message.includes('API key')) {
      return "Please check your API key configuration";
    }
    return "Unable to generate content at this time. Please try again later.";
  }
};

export const generateBlogOutline = async (title) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `Write a complete blog post for: "${title}"

Write a full, engaging blog post that includes:

1. An attention-grabbing introduction
2. Well-developed main content with clear sections
3. Relevant examples and explanations
4. A strong conclusion that ties everything together
5. Professional tone and natural flow

Make it read like a finished article that's ready to publish.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }]}],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings,
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating outline:', error);
    if (error.message.includes('API key')) {
      return "Please check your API key configuration";
    }
    return "Unable to generate outline at this time. Please try again later.";
  }
}; 