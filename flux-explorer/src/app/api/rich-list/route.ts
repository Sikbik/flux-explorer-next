/**
 * Rich List API Route
 *
 * Fetches rich list data from the scanner component
 */

import { NextRequest, NextResponse } from "next/server";
import ky from "ky";
import type { RichListData } from "@/types/rich-list";

const SCANNER_API_URL =
  process.env.SCANNER_API_URL ||
  process.env.NEXT_PUBLIC_SCANNER_API_URL ||
  "http://fluxscanner_explorertest2:3001";

const CACHE_DURATION = 3600; // 1 hour cache

export const revalidate = CACHE_DURATION;

/**
 * GET /api/rich-list
 * Fetch paginated rich list data
 *
 * Query params:
 * - page: Page number (1-based, default: 1)
 * - pageSize: Results per page (default: 100, max: 1000)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || "100"),
      1000
    );

    // Validate parameters
    if (page < 1 || pageSize < 1) {
      return NextResponse.json(
        { error: "Invalid page or pageSize parameter" },
        { status: 400 }
      );
    }

    // Fetch from scanner component
    const response = await ky
      .get(`${SCANNER_API_URL}/rich-list/paginated`, {
        searchParams: {
          page: page.toString(),
          pageSize: pageSize.toString(),
        },
        timeout: 30000,
        retry: {
          limit: 2,
          methods: ["get"],
          statusCodes: [408, 413, 429, 500, 502, 503, 504],
        },
      })
      .json<{
        lastUpdate: string;
        lastBlockHeight: number;
        totalSupply: number;
        totalAddresses: number;
        page: number;
        pageSize: number;
        totalPages: number;
        addresses: RichListData["addresses"];
      }>();

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${CACHE_DURATION * 2}`,
      },
    });
  } catch (error) {
    console.error("Failed to fetch rich list:", error);

    // Check if scanner is not ready yet
    if (error && typeof error === "object" && "response" in error) {
      const response = error.response as { status: number };
      if (response.status === 404) {
        return NextResponse.json(
          {
            error: "Rich list not yet available",
            message:
              "The rich list scanner is still processing. Please try again in a few minutes.",
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to fetch rich list",
        message:
          "Unable to retrieve rich list data. Please try again later.",
      },
      { status: 500 }
    );
  }
}
