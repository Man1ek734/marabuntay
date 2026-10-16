const { Client, GatewayIntentBits, ActivityType, ChannelType } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const GUILD_ID = '1558563456104407102';
const names = ['EL JEFE', 'SUB JEFE', 'OG', 'SOLDADO', 'MARABUNTA', 'RECLUTA', 'MARABUNTA BOT'];
const aliases = ['EL JEFE', 'SUB JEFE', 'OG', 'SOLDADO', 'MARABUNTA', 'RECLUTA', 'MARABUNTA BOT'];

async function ensureMarabuntaChannels(guild) {
  const layout = [
    { category: 'INFORMACJE', channels: [
      ['ogloszenia', ChannelType.GuildText],
      ['regulamin', ChannelType.GuildText],
      ['nadanie-rang', ChannelType.GuildText]
    ] },
    { category: 'ORGANIZACJA', channels: [
      ['zarzad', ChannelType.GuildText],
      ['awanse-i-degradacje', ChannelType.GuildText],
      ['nieobecnosci', ChannelType.GuildText],
      ['rekrutacja', ChannelType.GuildText]
    ] },
    { category: 'STREFA MARABUNTY', channels: [
      ['chat', ChannelType.GuildText],
      ['akcje', ChannelType.GuildText],
      ['materialy', ChannelType.GuildText],
      ['magazyn', ChannelType.GuildText]
    ] },
    { category: 'KANALY GLOSOWE', channels: [
      ['Pogaduchy', ChannelType.GuildVoice],
      ['Akcja 1', ChannelType.GuildVoice],
      ['Akcja 2', ChannelType.GuildVoice],
      ['Zarzad', ChannelType.GuildVoice]
    ] }
  ];
  await guild.channels.fetch();
  for (const section of layout) {
    let parent = guild.channels.cache.find(ch => ch.type === ChannelType.GuildCategory && ch.name === section.category);
    if (!parent) {
      parent = await guild.channels.create({ name: section.category, type: ChannelType.GuildCategory, reason: 'Struktura Marabunty' });
      console.log('Utworzono kategorie:', section.category);
    }
    for (const [name, type] of section.channels) {
      const existing = guild.channels.cache.find(ch => ch.type === type && ch.name === name);
      if (existing) continue;
      await guild.channels.create({ name, type, parent: parent.id, reason: 'Struktura Marabunty' });
      console.log('Utworzono kanal:', name);
    }
  }
}

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
    try { await ensureMarabuntaChannels(guild); } catch (e) { console.error('Blad tworzenia kanalow:', e.message); }
  } catch(e) { console.error('Blad rang:',e.message); }
});
client.on('error', error => console.error(error));
if (!process.env.DISCORD_BOT_TOKEN) {
 console.error('Ustaw DISCORD_BOT_TOKEN w Railway Variables');
 process.exit(1);
}
client.login(process.env.DISCORD_BOT_TOKEN).catch(e => {console.error('Logowanie:',e.message);process.exit(1)});
