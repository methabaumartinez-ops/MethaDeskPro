import fs from 'fs';
import path from 'path';
import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new QdrantClient({
    url: process.env.NEXT_PUBLIC_QDRANT_URL,
    apiKey: process.env.NEXT_PUBLIC_QDRANT_API_KEY,
    port: process.env.NEXT_PUBLIC_QDRANT_URL?.startsWith('https') ? 443 : 6333,
});

async function importContacts() {
    const filePath = path.resolve(process.cwd(), 'docs', 'methabau_contacts_extended.txt');
    console.log(`Reading file: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Split by | and trim whitespace
    const parts = content.split('|').map(s => s.trim());

    // Expected structure:
    // [0] Name1
    // [1] Role1
    // [2] nan
    // [3] Email1 Name2
    // [4] Role2
    // [5] nan
    // [6] Email2 Name3
    // ...
    // [End] EmailLast

    let currentName = parts[0];
    const contacts = [];

    // We step by 3: [i=0] -> Role at [i+1], nan at [i+2], Next block at [i+3]
    for (let i = 0; i < parts.length; i += 3) {
        // Safety check to ensure we have a role
        if (i + 1 >= parts.length) break;

        const role = parts[i + 1]?.replace(/[\r\n]+/g, ' ').trim();
        // parts[i+2] is 'nan', skip

        // Next block contains Email of CURRENT person and Name of NEXT person
        // Or just Email if it's the last one
        let email = "";
        let nextName = "";

        if (i + 3 < parts.length) {
            const nextBlock = parts[i + 3]?.replace(/[\r\n]+/g, ' ').trim();

            // Heuristic: Email usually ends with .ch or .com, and is the first word.
            // But names can be single word or multiple. 
            // Email always has '@'.

            // Let's find the email (first token with @)
            const spaceIndex = nextBlock.indexOf(' ');

            if (spaceIndex > 0) {
                // Assuming "email name" format
                email = nextBlock.substring(0, spaceIndex);
                nextName = nextBlock.substring(spaceIndex + 1).trim();
            } else {
                // Only email left (last item)
                email = nextBlock;
                nextName = ""; // Loop should finish naturally or via break
            }
        } else {
            // Should not happen if split logic holds, but careful
            break;
        }

        // Parse Name and Email
        // Name: "Adrian" -> Vorname: Adrian, Nachname: (from email?)
        // Email: "a.sennhauser@..." -> Sennhauser

        let vorname = currentName;
        let nachname = "";

        // Attempt to extract lastname from email
        if (email && email.includes('@')) {
            const prefix = email.split('@')[0]; // a.sennhauser
            const nameParts = prefix.split('.');
            if (nameParts.length > 1) {
                // capitalize last part
                nachname = nameParts[nameParts.length - 1];
                nachname = nachname.charAt(0).toUpperCase() + nachname.slice(1);
            } else {
                // e.g. "hr", "blechwerkstatt"
                nachname = prefix.charAt(0).toUpperCase() + prefix.slice(1);
                // If vorname is same as nachname (e.g. Blechwerkstatt), keep it
            }
        }

        // If currentName has spaces, maybe it already has lastname?
        // But listing suggests "Adrian", "Alain" (First names only).
        // File line 8: "Andrej"
        // File line 12: "Blechwerkstatt"

        // Final check on names
        if (!nachname) nachname = "."; // Placeholder

        const contact = {
            id: uuidv4(),
            vorname: vorname,
            nachname: nachname,
            rolle: role,
            email: email,
            abteilung: 'METHABAU', // Default
            image: `https://ui-avatars.com/api/?name=${vorname}+${nachname}&background=random`
        };

        contacts.push(contact);

        if (!nextName && i + 3 >= parts.length) {
            // End of list
            break;
        }

        currentName = nextName;
    }

    console.log(`Found ${contacts.length} contacts.`);

    // Upsert to Qdrant
    if (contacts.length > 0) {
        console.log('Upserting to Qdrant...');
        const collectionName = 'mitarbeiter';

        // Helper to chunk array
        const chunkSize = 50;
        for (let i = 0; i < contacts.length; i += chunkSize) {
            const chunk = contacts.slice(i, i + chunkSize);
            console.log(`Uploading chunk ${i} to ${i + chunk.length}...`);

            await client.upsert(collectionName, {
                points: chunk.map(c => ({
                    id: c.id, // ID must be UUID
                    payload: c,
                    vector: {} // Empty vector
                }))
            });
        }
        console.log('Upload complete.');
    } else {
        console.log('No contacts found to upload.');
    }
}

importContacts().catch(console.error);
