import type { Profession } from "@/lib/professions";

export function ProfessionSections({ profession }: { profession: Profession }) {
  return (
    <>
      <section className="profession-needs">
        <h2 className="profession-needs__title">What every {profession.noun}&rsquo;s signature needs</h2>
        <ul className="profession-needs__list">
          {profession.needs.map((need) => (
            <li key={need}>{need}</li>
          ))}
        </ul>
      </section>
      <section className="profession-faq">
        <h2 className="profession-faq__title">Frequently asked questions</h2>
        <div className="profession-faq__list">
          {profession.faqs.map((faq) => (
            <div className="profession-faq__item" key={faq.question}>
              <h3 className="profession-faq__question">{faq.question}</h3>
              <p className="profession-faq__answer">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
