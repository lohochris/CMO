// Supabase Edge Functions run on Deno runtime.
// Deno.serve is natively available in modern Deno.
declare const Deno: any;

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    console.log("[DEBUG] Edge Function Received Payload:", body);

    const TERMII_API_KEY = Deno.env.get("TERMII_API_KEY")?.trim();
    const SENDER_ID = Deno.env.get("TERMII_SENDER_ID") || "N-Alert";

    if (!TERMII_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "TERMII_API_KEY secret is missing on Supabase." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle action: 'get_balance' via Edge Function (avoids CORS in browser)
    if (body?.action === 'get_balance') {
      const balResponse = await fetch(`https://api.ng.termii.com/api/get-balance?api_key=${TERMII_API_KEY}`);
      const balData = await balResponse.json();
      console.log("[DEBUG] Termii Balance Response:", balData);

      if (balResponse.ok && balData.balance !== undefined) {
        return new Response(
          JSON.stringify({
            success: true,
            balance: Number(balData.balance) || 0,
            currency: balData.currency || "Units",
            data: balData
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ success: false, error: balData.message || "Failed to fetch Termii balance", data: balData }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { phone_number, first_name, amount, purpose, receipt_number } = body;

    if (!phone_number) {
      return new Response(
        JSON.stringify({ success: false, error: "Phone number is required." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    let formattedPhone = String(phone_number).trim().replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "234" + formattedPhone.substring(1);
    }

    const safeName = first_name || "Member";
    const safePurpose = purpose ? (purpose.length > 20 ? purpose.substring(0, 17) + "..." : purpose) : "Dues";
    const safeAmount = amount ? Number(amount).toLocaleString("en-NG") : "0";
    const safeRef = receipt_number || "RCP-2026";

    const messageText = `Hello Brother ${safeName}, payment of N${safeAmount} for ${safePurpose} is confirmed. Ref: ${safeRef}. Thank you! - CMO Badawa`;

    const response = await fetch("https://v4.api.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: formattedPhone,
        from: SENDER_ID,
        sms: messageText,
        type: "plain",
        channel: "dnd", // Changed from generic to dnd for 24/7 instant transactional delivery
        api_key: TERMII_API_KEY,
      }),
    });

    const termiiResult = await response.json();
    console.log("[DEBUG] Termii Response:", termiiResult);

    if (response.ok && (termiiResult.message_id || termiiResult.code === "ok" || termiiResult.status === "success")) {
      return new Response(
        JSON.stringify({ success: true, messageId: termiiResult.message_id, data: termiiResult }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: termiiResult.message || "Termii SMS dispatch failed", data: termiiResult }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal Edge Function Error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
