const Fastify = require('fastify');
const fastify = Fastify();

fastify.get('/status', async (request, reply) => {
  return { status: 'Bot is running!' };
});

fastify.listen({ port: 3001 }, (err, address) => {
  if (err) throw err;
  console.log(`Fastify server running at ${address}`);
});
