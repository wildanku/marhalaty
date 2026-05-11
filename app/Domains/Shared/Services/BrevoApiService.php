<?php

namespace App\Domains\Shared\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Facades\Log;

class BrevoApiService
{
    private Client $client;
    private string $apiKey;
    private const API_BASE_URL = 'https://api.brevo.com/v3';

    public function __construct()
    {
        $this->apiKey = config('services.brevo.api_key') ?? env('BREVO_API_KEY');
        
        if (empty($this->apiKey)) {
            throw new \RuntimeException(
                'Brevo API key is not configured. Please set BREVO_API_KEY in .env and run: php artisan config:cache'
            );
        }
        
        $this->client = new Client([
            'base_uri' => self::API_BASE_URL,
            'headers' => [
                'api-key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ],
        ]);
    }

    /**
     * Send email via Brevo API
     *
     * @param string $toEmail
     * @param string $toName
     * @param string $subject
     * @param string $htmlContent
     * @param string|null $textContent
     * @param array|null $replyTo
     * @return array
     */
    public function send(
        string $toEmail,
        string $toName,
        string $subject,
        string $htmlContent,
        ?string $textContent = null,
        ?array $replyTo = null,
    ): array {
        try {
            $fromEmail = config('mail.from.address');
            $fromName = config('mail.from.name');

            $payload = [
                'to' => [
                    [
                        'email' => $toEmail,
                        'name' => $toName,
                    ],
                ],
                'sender' => [
                    'email' => $fromEmail,
                    'name' => $fromName,
                ],
                'subject' => $subject,
                'htmlContent' => $htmlContent,
            ];

            if ($textContent) {
                $payload['textContent'] = $textContent;
            }

            if ($replyTo) {
                $payload['replyTo'] = $replyTo;
            }

            $response = $this->client->post('/smtp/email', [
                'json' => $payload,
            ]);

            $data = json_decode($response->getBody(), true);

            Log::info('Brevo API Email Sent', [
                'to' => $toEmail,
                'subject' => $subject,
                'messageId' => $data['messageId'] ?? null,
            ]);

            return [
                'success' => true,
                'message_id' => $data['messageId'] ?? null,
                'data' => $data,
            ];
        } catch (GuzzleException $e) {
            Log::error('Brevo API Email Failed', [
                'to' => $toEmail,
                'subject' => $subject,
                'error' => $e->getMessage(),
                'response' => $e->getResponse()?->getBody()->getContents(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
                'response' => $e->getResponse()?->getBody()->getContents(),
            ];
        } catch (\Exception $e) {
            Log::error('Brevo API Unexpected Error', [
                'to' => $toEmail,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}
