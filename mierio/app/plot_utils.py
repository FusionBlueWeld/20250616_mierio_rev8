import plotly.graph_objs as go
import plotly.utils
import json

def generate_scatter_plot(df_filtered, x_col, y_col, z_col):
    """
    フィルタリングされたDataFrameからPlotlyの散布図データを生成します。
    """
    if df_filtered.empty:
        return None, None # データが空の場合は何も生成しない

    z_min = df_filtered[z_col].min()
    z_max = df_filtered[z_col].max()

    scatter_data = go.Scattergl(
        x=df_filtered[x_col],
        y=df_filtered[y_col],
        mode='markers',
        marker=dict(
            size=10,
            color=df_filtered[z_col],
            colorscale='Jet',
            colorbar=dict(title=z_col),
            cmin=z_min,
            cmax=z_max,
            showscale=True
        ),
        hoverinfo='x+y+z',
        hovertemplate=f'<b>{x_col}:</b> %{{x}}<br><b>{y_col}:</b> %{{y}}<br><b>{z_col}:</b> %{{marker.color}}<extra></extra>'
    )

    layout = go.Layout(
        title=f'Scatter Plot: {z_col} vs {x_col} and {y_col}',
        xaxis=dict(title=x_col, automargin=True),
        yaxis=dict(title=y_col, automargin=True),
        hovermode='closest',
        margin=dict(t=50, b=50, l=50, r=50),
        uirevision='true'
    )
    
    return json.dumps([scatter_data], cls=plotly.utils.PlotlyJSONEncoder), \
           json.dumps(layout, cls=plotly.utils.PlotlyJSONEncoder)