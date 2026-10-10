const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const GUILD_ID = '1558563456104407102';
const names = ['EL JEFE', 'SUB JEFE', 'OG', 'SOLDADO', 'MARABUNTA', 'RECLUTA', 'MARABUNTA BOT'];
const aliases = ['EL JEFE', 'SUB JEFE', 'OG', 'SOLDADO', 'MARABUNTA', 'RECLUTA', 'MARABUNTA BOT'];
client.once('ready', async () => {
  console.log('Online: ' + client.user.tag);
  client.user.setPresence({status:'online', activities:[{name:'Marabunta | DreamLife RP',type:ActivityType.Watching}]});
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const roles = await guild.roles.fetch();
    for (let i = 0; i < names.length; i++) {
      const exact = roles.find(r => r.name === names[i]);
      if (exact) continue;
      const old = roles.find(r => r.name.includes(aliases[i]) && r.name !== names[i] && !r.managed);
      if (old && old.editable) {
        await old.setName(names[i], 'Usuniecie emoji z rangi');
        console.log('Zmieniono range:', names[i]);
      }
    }
    const member = await guild.members.fetch(client.user.id);
    let botRole = (await guild.roles.fetch()).find(r => r.name === 'MARABUNTA BOT');
    if (!botRole) botRole = await guild.roles.create({name:'MARABUNTA BOT',color:'#2875E3',hoist:true,reason:'Ranga bota'});
    if (!member.roles.cache.has(botRole.id)) await member.roles.add(botRole);
    console.log('Ranga bota gotowa');
  } catch(e) { console.error('Blad rang:',e.message); }
});
client.on('error', error => console.error(error));
if (!process.env.DISCORD_BOT_TOKEN) {
 console.error('Ustaw DISCORD_BOT_TOKEN w Railway Variables');
 process.exit(1);
}
client.login(process.env.DISCORD_BOT_TOKEN).catch(e => {console.error('Logowanie:',e.message);process.exit(1)});
