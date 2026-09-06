import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-kaoru-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function readSecretApiKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;

  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) throw new Error("SUPABASE_SECRET_KEYS no esta disponible.");

  const parsed = JSON.parse(raw);
  const value = parsed?.default || Object.values(parsed || {})[0];
  if (!value || typeof value !== "string") {
    throw new Error("No pude resolver la Secret API Key de Supabase.");
  }
  return value;
}

function humanRemaining(diff: number) {
  const minutes = Math.max(1, Math.ceil(diff / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.ceil(hours / 24)} d`;
}

function overdueText(diff: number) {
  const minutes = Math.max(1, Math.ceil(Math.abs(diff) / 60000));
  if (minutes < 60) return `Vencio hace ${minutes} min`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `Vencio hace ${hours} h`;
  return `Vencio hace ${Math.ceil(hours / 24)} d`;
}

function chooseAlert(
  preferences: {
    thresholds?: number[];
    overdue_enabled?: boolean;
  },
  dueMs: number,
  nowMs: number,
) {
  const diff = dueMs - nowMs;

  if (diff < 0) {
    if (preferences.overdue_enabled === false) return null;

    const overdueMinutes = Math.max(
      1,
      Math.ceil(Math.abs(diff) / 60000),
    );

    if (overdueMinutes <= 1) {
      return { key: "overdue-1m", diff, critical: true };
    }
    if (overdueMinutes <= 5) {
      return { key: "overdue-5m", diff, critical: true };
    }
    if (overdueMinutes <= 15) {
      return { key: "overdue-15m", diff, critical: true };
    }
    if (overdueMinutes <= 30) {
      return { key: "overdue-30m", diff, critical: true };
    }
    if (overdueMinutes <= 60) {
      return { key: "overdue-1h", diff, critical: true };
    }

    return { key: "overdue-late", diff, critical: false };
  }

  const remainingMinutes = Math.max(0, Math.ceil(diff / 60000));

  if (remainingMinutes <= 1) {
    return { key: "due-now", diff, critical: true };
  }
  if (remainingMinutes <= 5) {
    return { key: "before-5m", diff, critical: true };
  }
  if (remainingMinutes <= 15) {
    return { key: "before-15m", diff, critical: true };
  }
  if (remainingMinutes <= 30) {
    return { key: "before-30m", diff, critical: true };
  }
  if (remainingMinutes <= 60) {
    return { key: "before-1h", diff, threshold: 1, critical: true };
  }

  const thresholds = (Array.isArray(preferences.thresholds)
    ? preferences.thresholds
    : [24, 3, 1])
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 1)
    .sort((a, b) => a - b);

  const threshold = thresholds.find(
    (hours) => diff <= hours * 60 * 60 * 1000,
  );

  if (!threshold) return null;

  return {
    key: `before-${threshold}h`,
    threshold,
    diff,
    critical: false,
  };
}

function courseKey(userId: string, courseId: unknown) {
  return `${userId}:${String(courseId || "")}`;
}

function taskNotificationContext(
  userId: string,
  payload: Record<string, unknown>,
  courseMap: Map<string, Record<string, unknown>>,
) {
  const kind = String(payload.kind || "");
  const courseId = String(payload.courseId || "").trim();
  const course = courseId
    ? courseMap.get(courseKey(userId, courseId))
    : null;

  const courseName = String(
    course?.name ||
    payload.courseNameSnapshot ||
    "",
  ).trim();

  let professor = "";

  if (course) {
    if (kind === "lab") {
      professor = String(
        course.labProfessor ||
        course.theoryProfessor ||
        "",
      ).trim();
    } else {
      professor = String(course.theoryProfessor || "").trim();
    }
  } else {
    professor = String(payload.professorSnapshot || "").trim();
  }

  return { courseName, professor };
}

function taskBodySuffix(courseName: string, professor: string) {
  const parts: string[] = [];
  if (courseName) parts.push(courseName);
  if (professor) parts.push(`Docente: ${professor}`);
  return parts.length ? ` · ${parts.join(" · ")}` : "";
}

async function sendPush(
  admin: ReturnType<typeof createClient>,
  subscriptions: Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>,
  payload: string,
  options: {
    TTL?: number;
    urgency?: "very-low" | "low" | "normal" | "high";
  } = {},
) {
  let successful = 0;
  const errors: string[] = [];

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload,
        {
          TTL: options.TTL ?? 60 * 60,
          urgency: options.urgency ?? "high",
        },
      );

      successful++;
    } catch (error) {
      const statusCode = Number(
        (error as { statusCode?: number })?.statusCode || 0,
      );
      const message = String(
        (error as { message?: string })?.message || error,
      );

      errors.push(`${statusCode || "?"}: ${message}`);

      if (statusCode === 404 || statusCode === 410) {
        await admin
          .from("kaoru_push_subscriptions")
          .delete()
          .eq("id", subscription.id);
      }
    }
  }

  return { successful, errors };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const modeFromQuery = url.searchParams.get("mode");

  if (request.method === "GET" && modeFromQuery === "vapid") {
    const publicKey = Deno.env.get("KAORU_VAPID_PUBLIC_KEY");
    if (!publicKey) return json({ error: "VAPID public key missing" }, 503);
    return json({ publicKey });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const cronSecret = Deno.env.get("KAORU_CRON_SECRET") || "";
  const providedSecret = request.headers.get("x-kaoru-cron-secret") || "";

  if (!cronSecret || providedSecret !== cronSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const vapidPublic = Deno.env.get("KAORU_VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("KAORU_VAPID_PRIVATE_KEY");
  const vapidSubject =
    Deno.env.get("KAORU_VAPID_SUBJECT") ||
    "https://cmezav.github.io/kaoru_studio/";

  if (!vapidPublic || !vapidPrivate) {
    return json({ error: "VAPID secrets missing" }, 503);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) return json({ error: "SUPABASE_URL missing" }, 503);

  const admin = createClient(supabaseUrl, readSecretApiKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: preferences, error: preferencesError } = await admin
    .from("kaoru_push_preferences")
    .select("user_id,enabled,thresholds,overdue_enabled,timezone")
    .eq("enabled", true);

  if (preferencesError) {
    return json({ error: preferencesError.message }, 500);
  }

  if (!preferences?.length) {
    return json({ ok: true, sent: 0, users: 0, reason: "no-enabled-users" });
  }

  const enabledUsers = [...new Set(preferences.map((item) => item.user_id))];

  const { data: subscriptions, error: subscriptionsError } = await admin
    .from("kaoru_push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth,enabled")
    .in("user_id", enabledUsers)
    .eq("enabled", true);

  if (subscriptionsError) {
    return json({ error: subscriptionsError.message }, 500);
  }

  if (!subscriptions?.length) {
    return json({
      ok: true,
      sent: 0,
      users: enabledUsers.length,
      reason: "no-subscriptions",
    });
  }

  const { data: taskRows, error: tasksError } = await admin
    .from("kaoru_records")
    .select("user_id,entity_id,payload,deleted")
    .eq("module", "tasks")
    .eq("entity_type", "task")
    .eq("deleted", false)
    .in("user_id", enabledUsers)
    .limit(10000);

  if (tasksError) {
    return json({ error: tasksError.message }, 500);
  }

  const { data: courseRows, error: coursesError } = await admin
    .from("kaoru_records")
    .select("user_id,entity_id,payload,deleted")
    .eq("module", "tasks")
    .eq("entity_type", "course")
    .eq("deleted", false)
    .in("user_id", enabledUsers)
    .limit(10000);

  if (coursesError) {
    return json({ error: coursesError.message }, 500);
  }

  const preferenceMap = new Map(
    preferences.map((item) => [item.user_id, item]),
  );

  const subscriptionMap = new Map<string, typeof subscriptions>();

  for (const subscription of subscriptions) {
    const list = subscriptionMap.get(subscription.user_id) || [];
    list.push(subscription);
    subscriptionMap.set(subscription.user_id, list);
  }

  const courseMap = new Map<string, Record<string, unknown>>();

  for (const row of courseRows || []) {
    courseMap.set(
      courseKey(row.user_id, row.entity_id),
      (row.payload || {}) as Record<string, unknown>,
    );
  }

  const nowMs = Date.now();
  const appUrl =
    Deno.env.get("KAORU_APP_URL") ||
    "https://cmezav.github.io/kaoru_studio/#tasks";

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let summarySent = 0;

  /*
    1) Recordatorios individuales.
    Ahora incluyen el curso y, cuando existe, el docente actual.
  */
  for (const row of taskRows || []) {
    const payload = (row.payload || {}) as Record<string, unknown>;
    if (payload.completed) continue;
    if (!payload.dueAt) continue;

    const dueMs = Date.parse(String(payload.dueAt));
    if (!Number.isFinite(dueMs)) continue;

    const preferencesForUser = preferenceMap.get(row.user_id);
    if (!preferencesForUser) continue;

    const alert = chooseAlert(preferencesForUser, dueMs, nowMs);
    if (!alert) continue;

    const userSubscriptions = subscriptionMap.get(row.user_id) || [];
    if (!userSubscriptions.length) continue;

    const dueIso = new Date(dueMs).toISOString();

    const { error: claimError } = await admin
      .from("kaoru_push_delivery_log")
      .insert({
        user_id: row.user_id,
        task_id: String(row.entity_id),
        due_at: dueIso,
        alert_key: alert.key,
        status: "pending",
        attempts: 1,
      });

    if (claimError) {
      if (claimError.code === "23505") {
        skipped++;
        continue;
      }
      console.error("Push claim", claimError);
      failed++;
      continue;
    }

    const taskTitle = String(payload.title || "Tarea");
    const { courseName, professor } = taskNotificationContext(
      row.user_id,
      payload,
      courseMap,
    );

    const suffix = taskBodySuffix(courseName, professor);

    const notification =
      alert.key.startsWith("overdue")
        ? {
            title: "Tarea atrasada",
            body: `${taskTitle} · ${overdueText(alert.diff)}${suffix}`,
          }
        : alert.key === "due-now"
          ? {
              title: "Entrega ahora",
              body: `${taskTitle} vence ahora${suffix}`,
            }
          : {
              title: "Entrega proxima",
              body:
                `${taskTitle} vence en ${humanRemaining(alert.diff)}` +
                suffix,
            };

    const pushPayload = JSON.stringify({
      ...notification,
      tag: `kaoru-task-${row.entity_id}-${dueMs}`,
      url: appUrl,
      taskId: String(row.entity_id),
      dueAt: dueIso,
      alertKey: alert.key,
      renotify: Boolean(alert.critical),
      requireInteraction: Boolean(alert.critical),
      silent: false,
      timestamp: nowMs,
    });

    const result = await sendPush(
      admin,
      userSubscriptions,
      pushPayload,
      { TTL: 60 * 60, urgency: "high" },
    );

    sent += result.successful;

    if (result.successful > 0) {
      await admin
        .from("kaoru_push_delivery_log")
        .update({
          status: "sent",
          delivered_at: new Date().toISOString(),
          last_error: result.errors.length
            ? result.errors.join(" | ").slice(0, 1500)
            : null,
        })
        .eq("user_id", row.user_id)
        .eq("task_id", String(row.entity_id))
        .eq("due_at", dueIso)
        .eq("alert_key", alert.key);
    } else {
      failed++;

      await admin
        .from("kaoru_push_delivery_log")
        .delete()
        .eq("user_id", row.user_id)
        .eq("task_id", String(row.entity_id))
        .eq("due_at", dueIso)
        .eq("alert_key", alert.key);
    }
  }

  /*
    2) Notificacion-resumen.
    - Un solo tag, por lo que se reemplaza en vez de apilarse.
    - Se actualiza inmediatamente cuando cambian los conteos.
    - Si no cambia nada, se refresca cada 15 min como heartbeat.
    - Es silenciosa para no sonar cada vez que se actualiza.
  */
  const SUMMARY_TASK_ID = "__summary__";
  const SUMMARY_DUE_AT = "1970-01-01T00:00:00.000Z";
  const SUMMARY_HEARTBEAT_MS = 15 * 60 * 1000;

  for (const userId of enabledUsers) {
    const userSubscriptions = subscriptionMap.get(userId) || [];
    if (!userSubscriptions.length) continue;

    const pending = (taskRows || []).filter((row) => {
      if (row.user_id !== userId) return false;
      const payload = (row.payload || {}) as Record<string, unknown>;
      return !payload.completed;
    });

    let theory = 0;
    let lab = 0;
    let personal = 0;
    let overdue = 0;

    for (const row of pending) {
      const payload = (row.payload || {}) as Record<string, unknown>;
      const kind = String(payload.kind || "");

      if (kind === "lab") {
        lab++;
      } else if (kind === "personal" || payload.personal === true) {
        personal++;
      } else {
        theory++;
      }

      if (payload.dueAt) {
        const dueMs = Date.parse(String(payload.dueAt));
        if (Number.isFinite(dueMs) && dueMs < nowMs) {
          overdue++;
        }
      }
    }

    const total = pending.length;
    const summaryKey =
      `summary-${total}-${theory}-${lab}-${personal}-${overdue}`;

    const { data: lastSummaryRows, error: summaryReadError } = await admin
      .from("kaoru_push_delivery_log")
      .select("alert_key,delivered_at,created_at")
      .eq("user_id", userId)
      .eq("task_id", SUMMARY_TASK_ID)
      .order("created_at", { ascending: false })
      .limit(1);

    if (summaryReadError) {
      console.error("Summary state read", summaryReadError);
      failed++;
      continue;
    }

    const lastSummary = lastSummaryRows?.[0] || null;
    const lastDeliveredMs = lastSummary?.delivered_at
      ? Date.parse(String(lastSummary.delivered_at))
      : 0;

    const changed = lastSummary?.alert_key !== summaryKey;
    const heartbeatDue =
      total > 0 &&
      (!lastDeliveredMs || nowMs - lastDeliveredMs >= SUMMARY_HEARTBEAT_MS);

    if (total === 0) {
      /*
        Si habia un resumen anterior, enviamos una orden silenciosa
        al Service Worker para cerrarlo.
      */
      if (lastSummary && lastSummary.alert_key !== summaryKey) {
        const closePayload = JSON.stringify({
          tag: "kaoru-pending-summary",
          closeTag: "kaoru-pending-summary",
          url: appUrl,
          silent: true,
          timestamp: nowMs,
        });

        const result = await sendPush(
          admin,
          userSubscriptions,
          closePayload,
          { TTL: 15 * 60, urgency: "normal" },
        );

        sent += result.successful;
        summarySent += result.successful;

        if (result.successful > 0) {
          await admin
            .from("kaoru_push_delivery_log")
            .delete()
            .eq("user_id", userId)
            .eq("task_id", SUMMARY_TASK_ID);

          await admin
            .from("kaoru_push_delivery_log")
            .insert({
              user_id: userId,
              task_id: SUMMARY_TASK_ID,
              due_at: SUMMARY_DUE_AT,
              alert_key: summaryKey,
              status: "sent",
              attempts: 1,
              delivered_at: new Date().toISOString(),
            });
        }
      }

      continue;
    }

    if (!changed && !heartbeatDue) continue;

    const bodyParts = [
      `Teoria ${theory}`,
      `Lab ${lab}`,
    ];

    if (personal > 0) {
      bodyParts.push(`Sin curso ${personal}`);
    }

    if (overdue > 0) {
      bodyParts.push(`Atrasadas ${overdue}`);
    }

    const summaryPayload = JSON.stringify({
      title:
        total === 1
          ? "Kaoru · 1 tarea pendiente"
          : `Kaoru · ${total} tareas pendientes`,
      body: bodyParts.join(" · "),
      tag: "kaoru-pending-summary",
      url: appUrl,
      summary: true,
      renotify: false,
      requireInteraction: true,
      silent: true,
      timestamp: nowMs,
    });

    const result = await sendPush(
      admin,
      userSubscriptions,
      summaryPayload,
      { TTL: 60 * 60, urgency: "normal" },
    );

    sent += result.successful;
    summarySent += result.successful;

    if (result.successful > 0) {
      await admin
        .from("kaoru_push_delivery_log")
        .delete()
        .eq("user_id", userId)
        .eq("task_id", SUMMARY_TASK_ID);

      await admin
        .from("kaoru_push_delivery_log")
        .insert({
          user_id: userId,
          task_id: SUMMARY_TASK_ID,
          due_at: SUMMARY_DUE_AT,
          alert_key: summaryKey,
          status: "sent",
          attempts: 1,
          delivered_at: new Date().toISOString(),
          last_error: result.errors.length
            ? result.errors.join(" | ").slice(0, 1500)
            : null,
        });
    } else {
      failed++;
    }
  }

  return json({
    ok: true,
    sent,
    summarySent,
    skipped,
    failed,
    users: enabledUsers.length,
    tasks: taskRows?.length || 0,
  });
});
