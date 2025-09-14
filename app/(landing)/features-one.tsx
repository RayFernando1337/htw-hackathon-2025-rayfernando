import { Card } from '@/components/ui/card'
import { Table } from './table'
import { CpuArchitecture } from './cpu-architecture'
import { AnimatedListCustom } from './animated-list-custom'
  

export default function FeaturesOne() {
    return (
        <section id="features" className="py-16 md:py-32">
            <div className=" py-24">
                <div className="mx-auto w-full max-w-5xl px-6">
                    <div className="text-center">
                        <h2 className="text-foreground text-4xl font-semibold">Everything You Need to Host Great Events</h2>
                        <p className="text-muted-foreground mb-12 mt-4 text-balance text-lg">Replace fragmented emails, docs, and forms with one unified platform. Get your events approved faster with clear workflows and real-time feedback.</p>
                        <div className="bg-foreground/5 rounded-3xl p-6">
                            <Table />
                        </div>
                    </div>

                    <div className="border-foreground/10 relative mt-16 grid gap-12 border-b pb-12 [--radius:1rem] md:grid-cols-2">
                        <div>
                            <h3 className="text-foreground text-xl font-semibold">Smart Event Forms</h3>
                            <p className="text-muted-foreground my-4 text-lg">Multi-step wizard with auto-save. Never lose your progress and submit complete events the first time.</p>
                            <Card
                                className="aspect-video overflow-hidden px-6">
                                <Card className="h-full translate-y-6 rounded-b-none border-b-0 bg-muted/50">
                                    <CpuArchitecture />
                                </Card>
                            </Card>
                        </div>
                        <div>
                            <h3 className="text-foreground text-xl font-semibold">Field-Level Feedback</h3>
                            <p className="text-muted-foreground my-4 text-lg">No more confusing email threads. Get specific feedback on exactly what needs to change.</p>
                            <Card
                                className="aspect-video overflow-hidden">
                                <Card className="translate-6 h-full rounded-bl-none border-b-0 border-r-0 bg-muted/50 pt-6 pb-0">
                                    <AnimatedListCustom />
                                </Card>
                            </Card>
                        </div>
                    </div>

                    <blockquote className="before:bg-primary relative mt-12 max-w-xl pl-6 before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-full">
                        <p className="text-foreground text-lg">The submission to approval time went from days to hours. Field-level feedback means no more back-and-forth emails trying to explain what needs fixing.</p>
                        <footer className="mt-4 flex items-center gap-2">
                            <cite>Sarah Chen</cite>
                            <span
                                aria-hidden
                                className="bg-foreground/15 size-1 rounded-full"></span>
                            <span className="text-muted-foreground">Event Host</span>
                        </footer>
                    </blockquote>
                </div>
            </div>
        </section>
    )
}
