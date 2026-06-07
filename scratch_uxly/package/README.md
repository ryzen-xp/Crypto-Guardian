# @uxly/1shot-client

This is a TypeScript client SDK for 1Shot. It provides both a strongly typed REST client and a utility method for verifying webhook signatures.

## Installation

```bash
npm install @uxly/1shot-client
```

## Usage

### REST Client

```typescript
import { OneShotClient } from '@uxly/1shot-client';

// Initialize the client
const client = new OneShotClient({
  apiKey: 'your_api_key',
  apiSecret: 'your_api_secret',
  baseUrl: 'https://api.1shotapi.com/v1' // Optional, defaults to this URL
});

// List contractMethods for a business
const contractMethods = await client.contractMethods.list({
  businessId: 'your_business_id',
  params: { page: 1, pageSize: 10 }
});

// Execute a Contract Method
const transaction = await client.contractMethods.execute({
  contractMethodId: 'your_contract_method_id',
  params: {
    amount: '1000000000000000000', // 1 ETH in wei
    recipient: '0x123...'
  }
});

// Get Contract Method details
const contractMethod = await client.contractMethods.get('your_contract_method_id');

// Create a new transaction
const newContractMethod = await client.contractMethods.create({
  businessId: 'your_business_id',
  params: {
    name: 'Transfer ETH',
    description: 'Transfer ETH to a recipient',
    chainId: 1, // Ethereum mainnet
    contractAddress: '0x...',
    functionName: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'recipient',
        type: 'address'
      },
      {
        name: 'amount',
        type: 'uint256'
      }
    ]
  }
});
```

### Webhook Verification

#### Using the Standalone Function

```typescript
import { verifyWebhook } from '@uxly/1shot-client';
import express from 'express';

const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
  // Get the webhook body and signature
  const body = req.body;
  const signature = body.signature;
  delete body.signature;
  
  if (!signature) {
    return res.status(400).json({ error: 'Signature missing' });
  }
  
  // Your webhook public key
  const publicKey = 'your_webhook_public_key';
  
  try {
    // Verify the webhook signature
    const isValid = verifyWebhook({
      body,
      signature,
      publicKey
    });
    
    if (!isValid) {
      return res.status(403).json({ error: 'Invalid signature' });
    }
    
    return res.json({ message: 'Webhook verified successfully' });
    
  } catch (error) {
    return res.status(403).json({ error: error.message });
  }
});
```


## Error Handling

The client throws errors for various conditions:

- `RequestError` for HTTP request failures
- `ValidationError` for invalid parameters
- `InvalidSignatureError` for invalid webhook signatures

## Type Safety

The client includes comprehensive TypeScript types for better IDE support and type checking. All models and responses are properly typed using TypeScript interfaces.

## Publishing

This package is published to npm using modern Node.js packaging tools. Here's how to publish a new version:

1. Update the version in `package.json`:
```json
{
  "version": "0.1.0"  // Update this to your new version
}
```

2. Build the package:
```bash
npm run build
```

3. Test the build:
```bash
npm pack
npm install ./uxly-1shot-client-0.1.0.tgz
```

4. Publish to npm:
```bash
npm publish
```

Note: You'll need to have an npm account and be logged in. You can log in using:
```bash
npm login
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.