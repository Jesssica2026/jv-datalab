require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

const { STRIPE_SECRET_KEY, PORT = 4242 } = process.env;

if (!STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY não definida. Configure o arquivo .env a partir de .env.example.');
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

app.post('/create-subscription', async (req, res) => {
  const { email, priceId } = req.body;

  if (!email || !priceId) {
    return res.status(400).json({ error: 'Os campos "email" e "priceId" são obrigatórios.' });
  }

  try {
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });
    const customer = existingCustomers.data[0]
      ?? await stripe.customers.create({ email });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const clientSecret = subscription.latest_invoice.payment_intent.client_secret;

    res.status(200).json({
      subscriptionId: subscription.id,
      customerId: customer.id,
      clientSecret,
    });
  } catch (error) {
    console.error('Erro ao criar assinatura:', error.message);
    res.status(500).json({ error: 'Não foi possível criar a assinatura.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
