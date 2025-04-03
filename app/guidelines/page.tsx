import { Card } from "@/components/ui/card"

export default function GuidelinesPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Annotation Guidelines</h1>
        <p className="text-gray-600">
          This guide provides instructions and examples to help you complete annotations effectively and consistently.
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Rating System</h2>
          <div className="grid gap-6">
            <Card className="p-4">
              <h3 className="text-lg font-medium mb-2">Comprehensiveness</h3>
              <div className="space-y-2">
                <p className="text-sm">
                  Evaluates how well the summary covers all the important information from the original text.
                </p>
                <div className="pl-4 border-l-2 border-blue-200 mt-2">
                  <p className="text-sm mb-1"><strong>Score 1:</strong> There is not much difference between the plain text summary and the original abstract.</p>
                  <p className="text-sm mb-1"><strong>Score 2:</strong> The plain text summary omits a few sentences that include jargon or omits a few words in sentences. It becomes easier to read but does not truly simplify the content.</p>
                  <p className="text-sm mb-1"><strong>Score 3:</strong> The summary is a mix of jargon and simple terms, as well as simple and complex sentences, along with some definitions. Laypersons may understand the main points but could find specific terms or sentences confusing.</p>
                  <p className="text-sm mb-1"><strong>Score 4:</strong> The summary is overall easy to understand, with the occasional presence of a complex sentence or medical terms that are not explained to the reader.</p>
                  <p className="text-sm"><strong>Score 5:</strong> The summary removes jargon or uses simple synonyms for them. If it cannot do either, it adds context for the evaluator to grasp the complex term. It uses simple, straightforward sentences or makes use of examples, making it easy for anyone to understand.</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-lg font-medium mb-2">Layness</h3>
              <div className="space-y-2">
                <p className="text-sm">
                  Measures how easy it is for a non-expert to understand the summary.
                </p>
                <div className="pl-4 border-l-2 border-blue-200 mt-2">
                  <p className="text-sm mb-1"><strong>Score 1:</strong> The summary is full of technical jargon and would be difficult for a non-expert to understand.</p>
                  <p className="text-sm mb-1"><strong>Score 2:</strong> Some technical terms are explained, but many remain unexplained and would confuse a layperson.</p>
                  <p className="text-sm mb-1"><strong>Score 3:</strong> The summary balances technical accuracy with accessibility, though some concepts may still be challenging.</p>
                  <p className="text-sm mb-1"><strong>Score 4:</strong> Most concepts are explained in simple terms that a layperson could understand with minimal effort.</p>
                  <p className="text-sm"><strong>Score 5:</strong> The summary is extremely accessible and could be understood by anyone regardless of their background.</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-lg font-medium mb-2">Factuality</h3>
              <div className="space-y-2">
                <p className="text-sm">
                  Evaluates how accurately the summary represents the facts from the original text.
                </p>
                <div className="pl-4 border-l-2 border-blue-200 mt-2">
                  <p className="text-sm mb-1"><strong>Score 1:</strong> The summary contains multiple factual errors or misrepresentations of the original text.</p>
                  <p className="text-sm mb-1"><strong>Score 2:</strong> There are some factual inaccuracies that change the meaning or implications of the original text.</p>
                  <p className="text-sm mb-1"><strong>Score 3:</strong> The summary is mostly accurate but has minor factual errors or omissions that don't significantly impact understanding.</p>
                  <p className="text-sm mb-1"><strong>Score 4:</strong> The summary is highly accurate with only very minor issues that don't affect the meaning.</p>
                  <p className="text-sm"><strong>Score 5:</strong> The summary represents all facts from the original text with complete accuracy.</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-lg font-medium mb-2">Usefulness</h3>
              <div className="space-y-2">
                <p className="text-sm">
                  Assesses how valuable the summary is for understanding the key points of the original text.
                </p>
                <div className="pl-4 border-l-2 border-blue-200 mt-2">
                  <p className="text-sm mb-1"><strong>Score 1:</strong> The summary provides little value in understanding the original text's main points.</p>
                  <p className="text-sm mb-1"><strong>Score 2:</strong> Some key points are conveyed, but important information is missing or poorly explained.</p>
                  <p className="text-sm mb-1"><strong>Score 3:</strong> The summary is moderately useful, capturing most key points but lacking some context or depth.</p>
                  <p className="text-sm mb-1"><strong>Score 4:</strong> The summary effectively conveys almost all key points in a way that's valuable to readers.</p>
                  <p className="text-sm"><strong>Score 5:</strong> The summary provides exceptional value, perfectly distilling the original text's key points while maintaining necessary context.</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Labeling Errors</h2>
          <Card className="p-4">
            <p className="text-sm mb-4">
              When you identify errors in the summary, select the problematic text and choose the appropriate error type:
            </p>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm">Incorrect definitions</h4>
                <p className="text-xs text-gray-600 pl-4">When a term or concept is incorrectly defined in the summary.</p>
              </div>

              <div>
                <h4 className="font-medium text-sm">Incorrect synonyms</h4>
                <p className="text-xs text-gray-600 pl-4">When a technical term is replaced with an inappropriate synonym.</p>
              </div>

              <div>
                <h4 className="font-medium text-sm">Entity errors</h4>
                <p className="text-xs text-gray-600 pl-4">When people, organizations, or other named entities are incorrectly identified.</p>
              </div>

              <div>
                <h4 className="font-medium text-sm">Contradiction</h4>
                <p className="text-xs text-gray-600 pl-4">When the summary directly contradicts information in the original text.</p>
              </div>

              <div>
                <h4 className="font-medium text-sm">Omission</h4>
                <p className="text-xs text-gray-600 pl-4">When important information from the original text is missing from the summary.</p>
              </div>

              <div>
                <h4 className="font-medium text-sm">Jumping to conclusions</h4>
                <p className="text-xs text-gray-600 pl-4">When the summary makes assumptions or conclusions not supported by the original text.</p>
              </div>

              <div>
                <h4 className="font-medium text-sm">Misinterpretation</h4>
                <p className="text-xs text-gray-600 pl-4">When the summary misunderstands or misrepresents the meaning of the original text.</p>
              </div>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Annotation Process</h2>
          <Card className="p-4">
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>Read the original text in the left panel carefully.</li>
              <li>Read the summary in the right panel and evaluate its quality.</li>
              <li>Select any problematic text in the summary and assign appropriate error labels.</li>
              <li>Rate the summary on the four criteria: Comprehensiveness, Layness, Factuality, and Usefulness.</li>
              <li>Click "Submit Annotation" when you've completed your evaluation.</li>
            </ol>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Tips for Quality Annotations</h2>
          <Card className="p-4">
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>Compare the summary directly against the original text, not based on your existing knowledge.</li>
              <li>Be consistent in your ratings across different summaries.</li>
              <li>Label specific text spans rather than entire paragraphs when identifying errors.</li>
              <li>Consider both what information is included and how it's presented.</li>
              <li>If you're unsure about a rating, review the rating guide and examples above.</li>
            </ul>
          </Card>
        </section>
      </div>
    </div>
  )
} 