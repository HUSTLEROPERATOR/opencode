import { Log } from "./log"
import type { NodeProcessInternals } from "../types/external"

export namespace EventLoop {
  export async function wait() {
    return new Promise<void>((resolve) => {
      const check = () => {
        const proc = process as unknown as NodeProcessInternals
        const active = [...proc._getActiveHandles(), ...proc._getActiveRequests()]
        Log.Default.info("eventloop", {
          active,
        })
        if (proc._getActiveHandles().length === 0 && proc._getActiveRequests().length === 0) {
          resolve()
        } else {
          setImmediate(check)
        }
      }
      check()
    })
  }
}
