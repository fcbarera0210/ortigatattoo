import type { APIRoute } from 'astro';
import { Auth } from '@auth/core';
import { authConfig } from '../../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => Auth(request, authConfig);
export const POST: APIRoute = async ({ request }) => Auth(request, authConfig);
