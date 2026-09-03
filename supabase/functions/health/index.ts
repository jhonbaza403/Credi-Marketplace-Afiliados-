Deno.serve((request) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(
      JSON.stringify({
        status: "error",
        code: "METHOD_NOT_ALLOWED",
      }),
      {
        status: 405,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          allow: "GET, HEAD",
        },
      },
    );
  }

  const payload = JSON.stringify({
    status: "ok",
    service: "credi-marketplace-supabase",
  });

  return new Response(request.method === "HEAD" ? null : payload, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
});
