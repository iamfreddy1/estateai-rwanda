# ============================================
# PUSH NOTIFICATIONS HELPER
# ============================================
# Sends push notifications via Expo's Push API.
# Free, no Firebase setup needed. Docs: https://docs.expo.dev/push-notifications/sending-notifications/

import requests

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_push(token, title, body, data=None):
    """
    Send a single push notification.
    `token` is an Expo Push Token like "ExponentPushToken[xxxxxxxx]".
    `data` is an optional dict that arrives in the notification payload
    so the app can deep-link.

    Returns True if Expo accepted the request, False otherwise.
    Failures are silent (no exception) - notifications are best-effort.
    """
    if not token or not token.startswith("ExponentPushToken"):
        return False

    payload = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "priority": "high",
        "channelId": "default",
        "data": data or {},
    }

    try:
        res = requests.post(
            EXPO_PUSH_URL,
            json=payload,
            timeout=10,
            headers={
                "Accept": "application/json",
                "Accept-encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
        )
        # Expo returns {"data": {"status": "ok"}} on success
        if res.status_code == 200:
            return True
    except Exception:
        pass
    return False


def send_push_to_user(user, title, body, data=None):
    """Convenience wrapper for sending to a User model instance."""
    if not user or not user.expo_push_token:
        return False
    return send_push(user.expo_push_token, title, body, data=data)
