function coverLetter(job, profile, language = 'pt') {
  const projectNames = (profile.projects || []).map(p => p.name).join(', ');
  const skills = (profile.skills || []).slice(0, 8).join(', ');

  if (language === 'en') {
    return `Dear Hiring Team,\n\nI am applying for the ${job.title || 'position'} at ${job.company || 'your company'}. My background combines administrative and commercial operations with hands-on software, automation and AI projects. I have experience with ${skills}, and I have been developing real products such as ${projectNames}.\n\nI can contribute with organization, customer-facing communication, process ownership and a practical technology mindset. I am especially interested in roles involving implementation, technical operations, support, automation or junior software development.\n\nThank you for considering my application.\n\nSincerely,\n${profile.name}`;
  }

  return `Prezada equipe de recrutamento,\n\nTenho interesse na vaga de ${job.title || 'oportunidade'} na ${job.company || 'empresa'}. Minha trajetoria combina experiencia administrativa e comercial com atuacao pratica em desenvolvimento de software, automacao e inteligencia artificial. Trabalho com ${skills} e venho desenvolvendo produtos reais como ${projectNames}.\n\nPosso contribuir com organizacao, relacionamento com clientes, acompanhamento de processos e uma abordagem pratica para tecnologia e operacoes. Tenho especial interesse em funcoes de implementacao, operacoes tecnicas, suporte, automacao e desenvolvimento junior.\n\nAgradeco pela consideracao.\n\nAtenciosamente,\n${profile.name}`;
}

module.exports = { coverLetter };
