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
    return { key: "overdue", threshold: 0, diff };
  }

  const thresholds = (Array.isArray(preferences.thresholds)
    ? preferences.thresholds
    : [24, 3, 1])
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);

  const threshold = thresholds.find(
    (hours) => diff <= hours * 60 * 60 * 1000,
  );

  if (!threshold) return null;
  return {
    key: `before-${threshold}h`,
    threshold,
    diff,
  };
}

function overdueText(diff: number) {
  const minutes = Math.max(1, Math.ceil(Math.abs(diff) / 60000));
  if (minutes < 60) return `Vencio hace ${minutes} min`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `Vencio hace ${hours} h`;
  return `Vencio hace ${Math.ceil(hours / 24)} d`;
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
    return json({ ok: true, sent: 0, users: enabledUsers.length, reason: "no-subscriptions" });
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

  const preferenceMap = new Map(
    preferences.map((item) => [item.user_id, item]),
  );
  const subscriptionMap = new Map<string, typeof subscriptions>();

  for (const subscription of subscriptions) {
    const list = subscriptionMap.get(subscription.user_id) || [];
    list.push(subscription);
    subscriptionMap.set(subscription.user_id, list);
  }

  const nowMs = Date.now();
  const appUrl =
    Deno.env.get("KAORU_APP_URL") ||
    "https://cmezav.github.io/kaoru_studio/#tasks";

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of taskRows || []) {
    const payload = row.payload || {};
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
    const courseName = String(payload.courseNameSnapshot || "").trim();

    const notification =
      alert.key === "overdue"
        ? {
            title: "Tarea atrasada",
            body: `${taskTitle} · ${overdueText(alert.diff)}`,
          }
        : {
            title: "Entrega proxima",
            body:
              `${taskTitle} vence en menos de ${alert.threshold} h` +
              (courseName ? ` · ${courseName}` : ""),
          };

    const pushPayload = JSON.stringify({
      ...notification,
      tag: `kaoru-task-${row.entity_id}-${dueMs}-${alert.key}`,
      url: appUrl,
      taskId: String(row.entity_id),
      dueAt: dueIso,
      alertKey: alert.key,
    });

    let successfulForTask = 0;
    const errors: string[] = [];

    for (const subscription of userSubscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          pushPayload,
          {
            TTL: 60 * 60,
            urgency: "high",
          },
        );

        successfulForTask++;
        sent++;
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

    if (successfulForTask > 0) {
      await admin
        .from("kaoru_push_delivery_log")
        .update({
          status: "sent",
          delivered_at: new Date().toISOString(),
          last_error: errors.length ? errors.join(" | ").slice(0, 1500) : null,
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

  return json({
    ok: true,
    sent,
    skipped,
    failed,
    users: enabledUsers.length,
    tasks: taskRows?.length || 0,
  });
});
