// src/app/api/incident-digest/route.ts
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
    const body = await req.json()
    const { summary_stats, top_offenders, notable_alerts } = body
    // TODO: Replace this with real data from DB or state
    // const summary_stats = {
    //     total_requests: 10000,
    //     total_alerts: 218,
    //     error_bursts: 34,
    //     ip_spikes: 91,
    //     behavioral_deviations: 93,
    // }

    // const top_offenders = [
    //     { ip: '20.171.207.17', flags: [1, 3], request_count: 382 },
    //     { ip: '84.203.1.217', flags: [2], request_count: 244 },
    // ]

    // const notable_alerts = [
    //     {
    //         type: 'IP Spike',
    //         ip: '84.203.1.217',
    //         time: '05:13–05:20',
    //         path: '/wp-cron.php',
    //         explanation: 'Automated WordPress cron jobs triggered excessive traffic.',
    //     },
    //     {
    //         type: 'Error Burst',
    //         ip: '196.251.88.242',
    //         time: '08:49–08:50',
    //         path: '/wp-content/themes/about.php',
    //         status: 403,
    //         explanation: 'Bot likely probing for vulnerable themes.',
    //     },
    // ]

    const prompt = `
        You are a security analyst generating an executive summary report based on structured NGINX server anomaly data. The purpose is to provide insights to a DevOps team for awareness and action.

        Here is the data:
        ${JSON.stringify({ summary_stats, top_offenders, notable_alerts }, null, 2)}

        Please produce a clear, concise report with the following format:

        1. Summary Statistics
        - Total Requests: ...
        - Total Alerts: ...
        - Error Bursts: ...
        - IP Spikes: ...
        - Behavioral Deviations: ...

        2. Top Offending IPs
        List IPs with flags and why they matter.

        3. Notable Incidents
        Describe interesting or severe alerts in plain language.

        4. Recommendations
        Suggest possible security actions or mitigations.

        Use bullet points, be brief, and avoid excessive jargon.
    `


    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
    })

    const incidentReport = response.choices[0].message.content
    return NextResponse.json({ incidentReport })
}
