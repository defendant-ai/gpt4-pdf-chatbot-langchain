import { NextApiRequest, NextApiResponse } from 'next';
import { run } from 'scripts/ingest-data';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as console from "console";

// Initialize your Supabase client
const supabase = createClient(
    'https://hqvjoxpllpfwcayipjtz.supabase.co',
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxdmpveHBsbHBmd2NheWlwanR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODE3NzgxODksImV4cCI6MTk5NzM1NDE4OX0.os9KJ6oKkqHOogtZeuKcLF1AfsL3MCWj8zgc3RXUsRA"
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { userId, accessToken, refreshToken } = req.body;
        const session = {
            access_token: accessToken,
            refresh_token: refreshToken
        };
        await supabase.auth.setSession(session);

        try {
            // Get a list of user's files from Supabase
            console.log('Getting files')
            console.log('User ID', userId)
            const { data: files, error: filesError } = await supabase
                .storage
                .from('user_documents')
                .list(`${userId}`);
            if (filesError) throw filesError;
            if (!files || files.length === 0) throw new Error('No files found');


            // Download all files and save them locally
            await Promise.all(files.map(async file => {
                // Download the file
                const { data: fileBlob, error: downloadError } = await supabase
                    .storage
                    .from('user_documents')
                    .download(file.name);

                if (downloadError) throw downloadError;

                // Convert Blob to Buffer and save the file to the 'docs' directory
                const buffer = Buffer.from(await fileBlob.arrayBuffer());
                await fs.promises.writeFile(path.join('docs', file.name), buffer);
            }));

            console.log('Before')
            // Run the ingestion
            await run();
            console.log('After')

            // Delete the files from 'docs' directory
            for (const file of files) {
                fs.unlinkSync(path.join('docs', file.name));
            }

            res.status(200).json({ message: 'Ingestion complete' });
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'An error occurred during ingestion', error: err.message });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
