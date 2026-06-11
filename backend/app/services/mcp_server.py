from __future__ import annotations

from fastmcp import FastMCP

from .tools import compliance_validation_tool, monte_carlo_simulation_tool, portfolio_optimizer_tool, risk_score_tool

mcp = FastMCP("financial-tools")


@mcp.tool()
def risk_score_tool_mcp(age: int, income: float, monthly_investment: float, investment_horizon: int) -> dict:
    return risk_score_tool(age, income, monthly_investment, investment_horizon).output_data


@mcp.tool()
def monte_carlo_simulation_tool_mcp(expected_return: float, volatility: float, years: int) -> dict:
    return monte_carlo_simulation_tool(expected_return, volatility, years).output_data


@mcp.tool()
def portfolio_optimizer_tool_mcp(risk_profile: str) -> dict:
    return portfolio_optimizer_tool(risk_profile).output_data


@mcp.tool()
def compliance_validation_tool_mcp(risk_profile: str, allocation: dict) -> dict:
    return compliance_validation_tool(risk_profile, allocation).output_data
