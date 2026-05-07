export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://sacraimperia.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  try {
    const { lineItems, hasPreorder } = req.body;

    if (!lineItems || !lineItems.length) {
      return res.status(400).json({ error: 'No items in cart' });
    }

    // Call Stripe API directly (no SDK needed)
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', 'https://sacraimperia.com?success=true' + (hasPreorder ? '&preorder=true' : ''));
    params.append('cancel_url', 'https://sacraimperia.com?cancelled=true');
   

    lineItems.forEach((item, i) => {
      params.append(`line_items[${i}][price]`, item.price);
      params.append(`line_items[${i}][quantity]`, item.quantity);
    });

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (session.error) {
      return res.status(400).json({ error: session.error.message });
    }

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
