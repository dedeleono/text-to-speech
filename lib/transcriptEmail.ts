import { createTransport } from 'nodemailer';
import { render } from '@react-email/render';

import TranscriptEmail from '@/components/emails/transcript-email'

export async function sendTranscriptEmail(email: string, transcript: string) {
    const transport = createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        tls: {
            rejectUnauthorized: true,
            minVersion: 'TLSv1.2'
        },
        auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD
        }
    });

    const props = {
        userEmail: email,
        transcript
    };

    const html = await render(TranscriptEmail(props));

    await transport.sendMail({
        to: email,
        from: process.env.EMAIL_FROM,
        subject: `Tu transcripción de audio está lista`,
        text: `Tu transcripción de audio está lista:\n\n${transcript}\n\n`,
        html,
    });
}