export default function FAQs() {
    return (
        <section id="faqs" className="scroll-py-16 py-16 md:scroll-py-32 md:py-32">
            <div className="mx-auto max-w-5xl px-6">
                <div className="grid gap-y-12 px-2 lg:[grid-template-columns:1fr_auto]">
                    <div className="text-center lg:text-left">
                        <h2 className="mb-4 text-3xl font-semibold md:text-4xl">
                            Frequently <br className="hidden lg:block" /> Asked <br className="hidden lg:block" />
                            Questions
                        </h2>
                        <p>Everything you need to know about hosting events with HTW</p>
                    </div>

                    <div className="divide-y divide-dashed sm:mx-auto sm:max-w-lg lg:mx-0">
                        <div className="pb-6">
                            <h3 className="font-medium">How long does event approval take?</h3>
                            <p className="text-muted-foreground mt-4">With our streamlined review process, most events receive initial feedback within 24 hours. The full approval process typically takes 1-2 review cycles, compared to the previous 3-4 cycles.</p>

                            <ol className="list-outside list-decimal space-y-2 pl-4">
                                <li className="text-muted-foreground mt-4">Submit your complete event proposal through our multi-step form</li>
                                <li className="text-muted-foreground mt-4">Receive field-specific feedback from admin reviewers</li>
                                <li className="text-muted-foreground mt-4">Make requested changes and resubmit for final approval</li>
                            </ol>
                        </div>
                        <div className="py-6">
                            <h3 className="font-medium">What types of events can I submit?</h3>
                            <p className="text-muted-foreground mt-4">We support various event formats including panels, mixers, workshops, hackathons, and more. Each event type comes with its own dynamic checklist to ensure you don't miss critical planning steps.</p>
                        </div>
                        <div className="py-6">
                            <h3 className="font-medium">How does field-level feedback work?</h3>
                            <p className="text-muted-foreground my-4">Instead of confusing email threads, reviewers can leave specific feedback on individual form fields. You'll see exactly what needs to be changed, making the revision process clear and efficient.</p>
                            <ul className="list-outside list-disc space-y-2 pl-4">
                                <li className="text-muted-foreground">Feedback appears directly on the field that needs attention</li>
                                <li className="text-muted-foreground">Each feedback thread can be resolved independently</li>
                            </ul>
                        </div>
                        <div className="py-6">
                            <h3 className="font-medium">Can I save my progress and return later?</h3>
                            <p className="text-muted-foreground mt-4">Yes! Our auto-save feature ensures you never lose your work. Events remain in draft status until you're ready to submit, and you can return to edit them at any time before submission.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
