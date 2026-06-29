import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const pdfUrl = searchParams.get('url');

    if (!pdfUrl) {
        return NextResponse.json({ error: "Missing PDF URL" }, { status: 400 });
    }

    try {
        const response = await fetch(pdfUrl);

        if (!response.ok) {
            return NextResponse.json({ error: `Failed to fetch PDF: ${response.statusText}` }, { status: response.status });
        }

        const headers = new Headers();
        headers.set("Content-Type", "application/pdf");
        headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
        headers.set("Access-Control-Allow-Origin", "*");

        return new NextResponse(response.body, { 
            status: response.status,
            statusText: response.statusText,
            headers 
        });
    } catch (error) {
        console.error("Proxy PDF error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
