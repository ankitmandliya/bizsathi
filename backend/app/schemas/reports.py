from pydantic import BaseModel, ConfigDict


class PerformanceTrendItem(BaseModel):
    day: str
    date: str
    revenue: float
    height: int


class ActivityItem(BaseModel):
    id: str
    text: str
    time: str
    color: str
    category: str


class DashboardMetricsResponse(BaseModel):
    active_tenants: int
    active_tenants_trend: str
    total_revenue: float
    revenue_trend: str
    open_tasks: int
    tasks_trend: str
    system_health: str
    system_health_status: str
    active_leads: int
    open_deals: int
    subscriptions: int
    performance_trend: list[PerformanceTrendItem]
    recent_activities: list[ActivityItem]

    model_config = ConfigDict(from_attributes=True)
