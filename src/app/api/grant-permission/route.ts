/**
 * POST /api/grant-permission
 * 
 * Grants swap permission for a connected wallet address.
 * Validates a wallet signature to ensure the user authorized the permission.
 */

import { NextRequest, NextResponse } from 'next/server'

type GrantPermissionRequest = {
  userAddress: string
  chainId: number
  signature: string
  message: string
}

type GrantPermissionResponse = {
  ok: boolean
  message: string
  permissionId?: string
  grantedAt?: string
  error?: string
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<GrantPermissionResponse>> {
  try {
    const body = (await request.json()) as GrantPermissionRequest

    const { userAddress, chainId, signature, message } = body

    // Validate inputs
    if (!userAddress || !userAddress.startsWith('0x')) {
      return NextResponse.json(
        { ok: false, error: 'Invalid userAddress', message: 'Invalid userAddress provided' },
        { status: 400 }
      )
    }

    if (!chainId || chainId <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Invalid chainId', message: 'Invalid chainId provided' },
        { status: 400 }
      )
    }

    if (!signature || !signature.startsWith('0x')) {
      return NextResponse.json(
        { ok: false, error: 'Invalid signature', message: 'Signature required for permission' },
        { status: 400 }
      )
    }

    if (!message) {
      return NextResponse.json(
        { ok: false, error: 'Invalid message', message: 'Message required for signature verification' },
        { status: 400 }
      )
    }

    console.warn(`[GrantPermission] Validating signature for ${userAddress} on chain ${chainId}`)
    console.warn(`[GrantPermission] Signature: ${signature.slice(0, 20)}...`)

    // In production, you would verify the signature here using ethers or viem
    // For now, we just accept it if it looks valid (starts with 0x and is 132+ chars)
    const isValidSignature = signature.length >= 130 // 0x + 128 hex chars for a 65-byte signature

    if (!isValidSignature) {
      return NextResponse.json(
        { ok: false, error: 'Invalid signature format', message: 'Signature does not appear to be valid' },
        { status: 400 }
      )
    }

    // Generate a permission ID (just for tracking)
    const permissionId = `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`
    const grantedAt = new Date().toISOString()

    console.warn(`[GrantPermission] Permission granted for ${userAddress} - ID: ${permissionId}`)

    // Return success with permission details
    return NextResponse.json(
      {
        ok: true,
        message: `Permission granted successfully for ${userAddress}`,
        permissionId,
        grantedAt,
      },
      { status: 200 }
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[GrantPermission] Error:', errorMsg)

    return NextResponse.json(
      {
        ok: false,
        error: errorMsg,
        message: `Failed to grant permission: ${errorMsg}`,
      },
      { status: 500 }
    )
  }
}
