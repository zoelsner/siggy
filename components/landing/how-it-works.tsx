export function HowItWorks() {
  const steps = [
    {
      number: "1",
      title: "Pick a template",
      description: "Choose from four editorial-quality layouts designed to look great in Gmail, Outlook, and Apple Mail."
    },
    {
      number: "2",
      title: "Fill in your details",
      description: "Name, title, links, colors, headshot. The editor shows a live preview as you type."
    },
    {
      number: "3",
      title: "Copy & paste",
      description: "One click copies your signature HTML. Paste it into your email client and you're done."
    }
  ];

  return (
    <section className="how-it-works" id="how-it-works">
      <h2 className="how-it-works__title">How it works</h2>
      <div className="how-it-works__grid">
        {steps.map((step) => (
          <div className="step-card" key={step.number}>
            <div className="step-card__number">{step.number}</div>
            <h3 className="step-card__title">{step.title}</h3>
            <p className="step-card__desc">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
