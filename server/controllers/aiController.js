import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import FormData from "form-data";
import fs from "fs";
import pdf from "pdf-parse/lib/pdf-parse.js";


const AI = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

// generateArticle api
export const generateArticle = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt, length } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if(plan !== 'premium' && free_usage >= 10){
            return res.json({ success: false, message: "Limit reached. Upgrade to continue." })
        }

        const response = await AI.chat.completions.create({
    model: "gemini-2.0-flash",
    messages: [{role: "user", content: prompt, } ],
    temperature: 0.7,
    max_tokens: length,
});

    const content = response.choices[0].message.content

    await sql` INSERT INTO creations (user_id, prompt, content, type) 
    VALUES (${userId}, ${prompt}, ${content}, 'article')`;

    if (plan !== 'premium'){
        await clerkClient.users.updateUserMetadata(userId, {
            privateMetadata:{
                free_usage: free_usage + 1
            }
        })
    }

    res.json({ success: true, content})


    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}

// generateBlogTitle api

export const generateBlogTitle = async (req, res)=>{
    try {
        const { userId } = req.auth();
        const { prompt } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if(plan !== 'premium' && free_usage >= 10){
            return res.json({ success: false, message: "Limit reached. Upgrade to continue." })
        }

        const response = await AI.chat.completions.create({
    model: "gemini-2.0-flash",
    messages: [{role: "user", content: prompt, } ],
    temperature: 0.7,
    max_tokens: 100,
});

    const content = response.choices[0].message.content

    await sql` INSERT INTO creations (user_id, prompt, content, type) 
    VALUES (${userId}, ${prompt}, ${content}, 'blog-title')`;

    if (plan !== 'premium'){
        await clerkClient.users.updateUserMetadata(userId, {
            privateMetadata:{
                free_usage: free_usage + 1
            }
        })
    }

    res.json({ success: true, content})


    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}

// generateImage api

export const generateImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, publish } = req.body;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium subscriptions",
      });
    }

    // Generate image via Gemini AI (or other free API you have)
    const response = await AI.images.generate({
      model: "gemini-image-1.0",
      prompt,
      size: "1024x1024",
    });

    // The API should return a base64 image or URL
    const base64Image = response.data[0].b64_json;

    if (!base64Image) {
      return res.json({ success: false, message: "Image generation failed" });
    }

    // Upload to Cloudinary
    const { secure_url } = await cloudinary.uploader.upload(
      `data:image/png;base64,${base64Image}`
    );

    // Save to database
    await sql`
      INSERT INTO creations (user_id, prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})
    `;

    res.json({ success: true, content: secure_url });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.json({
      success: false,
      message:
        error.response?.data?.error?.message || error.message || "Something went wrong",
    });
  }
};

// removeImageBackground api

export const removeImageBackground = async (req, res)=>{
    try {
        const { userId } = req.auth();
        const image = req.file;
        const plan = req.plan;

        if(plan !== 'premium'){
            return res.json({ success: false, message: "This feature is only available for premium subscriptions"})
        }

            const {secure_url} = await cloudinary.uploader.upload(image.path, {
                transformation: [
                    {
                        effect: 'background_removal',
                        background_removal: 'remove_the_background'
                    }
                ]
            })


    await sql` INSERT INTO creations (user_id, prompt, content, type) 
    VALUES (${userId}, 'Remove background form image', ${secure_url}, 'image')`;

    res.json({ success: true, content: secure_url})


    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}

// removeImageObject api

export const removeImageObject = async (req, res)=>{
    try {
        const { userId } = req.auth();
        const { object } = req.body();
        const image = req.file;
        const plan = req.plan;

        if(plan !== 'premium'){
            return res.json({ success: false, message: "This feature is only available for premium subscriptions"})
        }

            const {public_id} = await cloudinary.uploader.upload(image.path)

            const imageUrl = cloudinary.url(public_id,{
                transformation: [{effect: `gen_remove:${object}`}],
                resource_type: 'image'
            })


    await sql` INSERT INTO creations (user_id, prompt, content, type) 
    VALUES (${userId}, ${`Removed ${object} from image`}, ${imageUrl}, 'image')`;

    res.json({ success: true, content: imageUrl})


    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}


// resume Review api

export const resumeReview = async (req, res)=>{
    try {
    const { userId } = req.auth();
    const resume = req.file;
    const plan = req.plan;

    if(plan !== 'premium'){
      return res.json({ success: false, message: "This feature is only available for premium subscriptions"});
    }

    if(!resume) return res.json({ success: false, message: "Resume file is required" });
    if(resume.size > 5 * 1024 * 1024){
      return res.json({ success: false, message: "Resume file size exceeds allowed size (5MB)." });
    }

    const dataBuffer = fs.readFileSync(resume.path);
    const pdfData = await pdf(dataBuffer);

    const prompt = `Review the following resume and provide constructive feedback. Highlight its strengths, weaknesses, and specific areas for improvement. Offer clear and actionable suggestions that could help make the resume more effective. Resume Content:\n\n${pdfData.text}`;

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;

    await sql`INSERT INTO creations (user_id, prompt, content, type) 
               VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume-review')`;

    res.json({ success: true, content });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};