import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Tailwind,
} from "@react-email/components";

interface TranscriptEmailProps {
  userEmail: string;
  transcript: string;
}

export default function TranscriptEmail({
  transcript,
}: TranscriptEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu transcripción de audio está lista</Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto py-8 px-4">
            <Heading className="text-2xl font-bold text-center mb-4 text-[#034180]">
              Tu transcripción está lista
            </Heading>
            <Text className="text-gray-600 mb-4">
              Hola, aquí tienes la transcripción de tu audio:
            </Text>
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <Text className="text-gray-800 whitespace-pre-wrap">
                {transcript}
              </Text>
            </div>
            <Text className="text-gray-500 text-sm mt-4">
              Este es un correo automático, por favor no responder.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
