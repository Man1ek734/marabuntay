const { Client, GatewayIntentBits, ActivityType, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const GUILD_ID = '1558563456104407102';
const names = ['EL JEFE', 'SUB JEFE', 'OG', 'SOLDADO', 'MARABUNTA', 'RECLUTA', 'MARABUNTA BOT'];
const aliases = ['EL JEFE', 'SUB JEFE', 'OG', 'SOLDADO', 'MARABUNTA', 'RECLUTA', 'MARABUNTA BOT'];


const hierarchy = ['EL JEFE','SUB JEFE','OG','SOLDADO','MARABUNTA','RECLUTA'];
const staffNames = ['EL JEFE','SUB JEFE','OG'];
const managerNames = ['EL JEFE','SUB JEFE'];
const ticketCategoryName = 'TICKETY';
const ticketChannelName = 'otworz-ticket';
const staffView = ['EL JEFE','SUB JEFE','OG'];

function roleIds(guild, list) {
  return list.map(n => guild.roles.cache.find(r => r.name === n)?.id).filter(Boolean);
}
function permissionsFor(guild, type, name) {
  const all = guild.roles.everyone.id;
  const leadership = roleIds(guild, managerNames);
  const staff = roleIds(guild, staffNames);
  const members = roleIds(guild, hierarchy);
  const bot = guild.members.me?.id || client.user.id;
  const admin = [{id: bot, allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.ManageChannels,PermissionFlagsBits.ManageMessages,PermissionFlagsBits.Connect]}];
  const isPublic = name === ticketChannelName || name === 'rekrutacja' || name === 'regulamin' || name === 'ogloszenia';
  const restricted = name === 'zarzad' || name === 'Zarzad' || name === 'awanse-i-degradacje';
  const allowed = restricted ? leadership : members;
  const overrides = [{id:all,deny:[PermissionFlagsBits.ViewChannel]}, ...admin];
  for(const id of (isPublic ? [] : allowed)) overrides.push({id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.Connect]});
  if(isPublic) overrides[0] = {id:all,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory],deny:[PermissionFlagsBits.SendMessages]};
  if(type===ChannelType.GuildVoice) return overrides;
  const writable = ['chat','akcje','materialy','magazyn','nieobecnosci','rekrutacja'];
  if(writable.includes(name)) {
    for(const id of (name==='rekrutacja' ? [all] : allowed)) {
      let o=overrides.find(v=>v.id===id);
      if(!o){o={id,allow:[]};overrides.push(o);}
      o.allow.push(PermissionFlagsBits.SendMessages);
      if(id===all) o.deny = (o.deny||[]).filter(p=>p!==PermissionFlagsBits.SendMessages);
    }
  } else if(name !== ticketChannelName) {
    for(const id of staff) {
      let o=overrides.find(v=>v.id===id);
      if(!o){o={id,allow:[PermissionFlagsBits.ViewChannel]};overrides.push(o);}
      o.allow.push(PermissionFlagsBits.SendMessages);
    }
    if(name==='zarzad'||name==='awanse-i-degradacje') {
      for(const o of overrides.filter(v=>staff.includes(v.id)&&!leadership.includes(v.id))) o.allow=o.allow.filter(p=>p!==PermissionFlagsBits.SendMessages);
    }
  }
  return overrides;
}
async function configureChannel(guild, channel) {
  if(channel.type===ChannelType.GuildCategory) return;
  if(!channel.parent) return;
  const managedCategories=['INFORMACJE','ORGANIZACJA','STREFA MARABUNTY','KANALY GLOSOWE'];
  if(!managedCategories.includes(channel.parent.name)) return;
  const overrides=permissionsFor(guild,channel.type,channel.name);
  await channel.permissionOverwrites.set(overrides,'Uprawnienia Marabunty');
}
async function ensureTicketPanel(guild) {
  await guild.channels.fetch();
  let cat = guild.channels.cache.find(x=>x.type===ChannelType.GuildCategory && x.name===ticketCategoryName);
  if(!cat) cat=await guild.channels.create({name:ticketCategoryName,type:ChannelType.GuildCategory,reason:'Tickety Marabunty'});
  let panel=guild.channels.cache.find(x=>x.type===ChannelType.GuildText && x.name===ticketChannelName);
  const bot= guild.members.me?.id||client.user.id;
  if(!panel) panel=await guild.channels.create({name:ticketChannelName,type:ChannelType.GuildText,parent:cat.id,reason:'Panel ticketow'});
  await panel.permissionOverwrites.set([
    {id:guild.roles.everyone.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory],deny:[PermissionFlagsBits.SendMessages]},
    {id:bot,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.ManageChannels]}
  ]);
  const recent=await panel.messages.fetch({limit:30});
  const exists=recent.some(m=>m.author.id===client.user.id && m.components?.some(row=>row.components?.some(b=>b.customId==='marabunta_ticket_open')));
  if(!exists) await panel.send({
    embeds:[new EmbedBuilder().setTitle('Centrum pomocy Marabunty').setDescription('Potrzebujesz pomocy, chcesz zlozyc podanie albo zglosic problem? Kliknij ponizej, aby otworzyc prywatny ticket.').setColor(0x2875e3)],
    components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('marabunta_ticket_open').setLabel('Otworz ticket').setStyle(ButtonStyle.Primary))]
  });
}
client.on('interactionCreate',async interaction=>{
  if(!interaction.isButton() || !['marabunta_ticket_open','marabunta_ticket_close'].includes(interaction.customId)) return;
  if(!interaction.inGuild() || interaction.guildId!==GUILD_ID) return;
  try {
    await interaction.deferReply({flags:64});
    const guild=interaction.guild;
    await guild.channels.fetch();
    if(interaction.customId==='marabunta_ticket_open'){
      const existing=guild.channels.cache.find(ch=>ch.type===ChannelType.GuildText && ch.topic=== 'marabunta-ticket-owner:'+interaction.user.id);
      if(existing) return interaction.editReply('Masz juz otwarty ticket: '+existing.toString());
      const cat=guild.channels.cache.find(ch=>ch.type===ChannelType.GuildCategory && ch.name===ticketCategoryName);
      if(!cat) return interaction.editReply('Brak kategorii ticketow. Skontaktuj sie z administracja.');
      const staff=roleIds(guild,staffNames);
      const name='ticket-'+interaction.user.id;
      const ch=await guild.channels.create({
        name,type:ChannelType.GuildText,parent:cat.id,topic:'marabunta-ticket-owner:'+interaction.user.id,
        permissionOverwrites:[
          {id:guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},
          {id:interaction.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},
          {id:client.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ManageChannels,PermissionFlagsBits.ReadMessageHistory]},
          ...staff.map(id=>({id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]}))
        ],reason:'Ticket Marabunty'
      });
      await ch.send({content:'Witaj <@'+interaction.user.id+'>! Opisz swoja sprawe. Obsluga wkrotce odpowie.',
        components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('marabunta_ticket_close').setLabel('Zamknij ticket').setStyle(ButtonStyle.Danger))]});
      await interaction.editReply('Ticket utworzony: '+ch.toString());
    } else {
      const ch=interaction.channel;
      if(!ch.topic?.startsWith('marabunta-ticket-owner:')) return interaction.editReply('To nie jest kanal ticketu.');
      const owner=ch.topic.split(':')[1];
      const canClose=interaction.user.id===owner || interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) || staffNames.some(n=>interaction.member?.roles?.cache?.some(r=>r.name===n));
      if(!canClose) return interaction.editReply('Nie masz uprawnien do zamkniecia tego ticketu.');
      await interaction.editReply('Ticket zostal zamkniety.');
      await ch.delete('Ticket zamkniety przez '+interaction.user.id);
    }
  }catch(e){console.error('Blad ticketow:',e);if(interaction.deferred) await interaction.editReply('Wystapil blad. Sprawdz uprawnienia bota.').catch(()=>{});}
});

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
    try { await ensureMarabuntaChannels(guild); await guild.channels.fetch(); for (const ch of guild.channels.cache.values()) { try { await configureChannel(guild,ch); } catch(e) { console.error('Permisje kanalu '+ch.name+':',e.message); } } await ensureTicketPanel(guild); } catch (e) { console.error('Blad konfiguracji serwera:', e.message); }
  } catch(e) { console.error('Blad rang:',e.message); }
});
client.on('error', error => console.error(error));
if (!process.env.DISCORD_BOT_TOKEN) {
 console.error('Ustaw DISCORD_BOT_TOKEN w Railway Variables');
 process.exit(1);
}
client.login(process.env.DISCORD_BOT_TOKEN).catch(e => {console.error('Logowanie:',e.message);process.exit(1)});
