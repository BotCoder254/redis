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
    
    const prompt = `Generate 3 complete blog post ideas for the topic: "${topic}". For each idea, write in proper Markdown format:

# [Title]

## Introduction
[A complete introduction paragraph that hooks the reader]

## Overview
[Full overview with bullet points]
* Point 1
* Point 2
* Point 3

## Conclusion
[A compelling conclusion paragraph]

Use proper Markdown formatting:
- Use ## for section headings
- Use * or - for bullet points
- Use ** for bold text
- Use * for italic text
- Use \`\`\` for code blocks if needed
- Use > for blockquotes
- Use proper line breaks

Separate each suggestion with "---"`;

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
    
    const prompt = `Write a complete blog post for: "${title}" using proper Markdown formatting.

Use the following Markdown structure:

# ${title}

## Introduction
[Attention-grabbing introduction paragraph]

## [Main Section 1]
[Well-developed content with examples]

## [Main Section 2]
[Clear explanations and details]

## [Main Section 3]
[Supporting information and insights]

## Conclusion
[Strong conclusion that ties everything together]

Remember to:
- Use ## for section headings
- Use * or - for bullet points
- Use ** for bold text
- Use * for italic text
- Use \`\`\` for code blocks if needed
- Use > for blockquotes
- Use proper line breaks between sections
- Include relevant links if applicable
- Format lists and subheadings properly

Make it read like a finished, professionally formatted blog post.`;

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