import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, currency, title, email } = await req.json();

    // Paystack only supports NGN natively
    // KES is converted to NGN at a rough rate
    const paystackAmount = currency === 'KES'
      ? Math.round(amount * 1.82 * 100) // KES → NGN conversion, then to kobo
      : Math.round(amount * 100);        // NGN to kobo

    const paystackCurrency = 'NGN'; // always settle in NGN

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email ?? 'customer@flux.app',
        amount: paystackAmount,
        currency: paystackCurrency,
        metadata: {
          custom_fields: [
            {
              display_name: 'Payment For',
              variable_name: 'payment_for',
              value: title,
            },
            {
              display_name: 'Original Currency',
              variable_name: 'original_currency',
              value: currency,
            },
          ],
        },
      }),
    });

    const data = await res.json();
    console.log('Paystack response:', JSON.stringify(data));

    if (!res.ok || !data.status) {
      throw new Error(data.message ?? 'Failed to initialize payment');
    }

    return NextResponse.json({ hostedUrl: data.data.authorization_url });
  } catch (error) {
    console.error('Checkout error:', (error as Error).message);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}